/**
 * [MODEL] Treinamento do recomendador
 *
 * O QUE FAZ: treina o modelo que ordena os produtos antes de eles
 * chegarem ao assistente, usando os dados de vendas e o feedback dos
 * clientes, e grava uma versão nova.
 *
 * COMO FARÁ:
 *
 *   1. Lê as interações já avaliadas. Cada produto sugerido vira um
 *      exemplo: rótulo 1 se o cliente marcou a resposta como útil, 0 se
 *      marcou como não útil. Resposta sem avaliação não entra — sem
 *      rótulo não há o que aprender com ela.
 *   2. Extrai os atributos de cada par (cliente, produto) com o MESMO
 *      código que a recomendação usa, `src/utils/recomendacao.ts`. As
 *      preferências saem do histórico de compras e a popularidade sai do
 *      total vendido: é por aqui que os dados de VENDAS entram.
 *   3. Embaralha com semente fixa e separa 30% para validação, para a
 *      acurácia relatada não ser a do próprio gabarito.
 *   4. Treina por descida de gradiente e grava os pesos.
 *
 * POR QUE não é ajuste fino do Gemini: a API do Google não oferece
 * fine-tuning desde a descontinuação do Flash-001 — só a Vertex AI, que
 * exige projeto com faturamento. O modelo treinado aqui é o recomendador,
 * e o generativo continua respondendo em cima do que ele ordenou. A
 * premissa está escrita em docs/PREMISSAS.md.
 *
 * COMO NOVOS DADOS ENTRAM: rodar de novo. Cada conversa nova avaliada no
 * chat já é uma linha a mais em `interacao_chat`, e cada compra muda as
 * preferências e o total vendido. O treino seguinte lê o estado atual e
 * grava a versão seguinte; o assistente passa a usar a mais recente na
 * próxima pergunta, sem reiniciar nada.
 *
 * USO: `npm run treinar`
 *
 * ATENDE: RNF0047
 */

import { PrismaClient } from '@prisma/client';

import {
  ATRIBUTOS,
  Atributo,
  atributosDe,
  porFrequencia,
  PesosDoModelo,
  pontuarComModelo,
} from '../src/utils/recomendacao';

const prisma = new PrismaClient();

/** A fração separada para medir — nunca vista durante o ajuste dos pesos. */
const FRACAO_DE_VALIDACAO = 0.3;

/** Passos de descida de gradiente e o tamanho de cada passo. */
const EPOCAS = 600;
const TAXA = 0.5;

/** Regularização L2: segura os pesos e evita decorar o conjunto pequeno. */
const REGULARIZACAO = 0.01;

interface Exemplo {
  atributos: number[];
  rotulo: number;
}

/** mulberry32, o mesmo das outras cargas: embaralhar sem virar sorteio. */
const geradorDe = (semente: number) => {
  let estado = semente;

  return (): number => {
    estado |= 0;
    estado = (estado + 0x6d2b79f5) | 0;
    let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const embaralhar = <T>(lista: T[]): T[] => {
  const sortear = geradorDe(97531);
  const copia = [...lista];

  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(sortear() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }

  return copia;
};

/**
 * Monta os exemplos. O contexto de cada cliente é lido do estado ATUAL do
 * banco, não do que ele era no dia da conversa — o histórico de compras
 * não guarda foto do passado. A consequência está documentada: o modelo
 * aprende a relação entre o perfil de hoje e a avaliação dada, que é o
 * que se quer aplicar nas conversas de amanhã.
 */
const montarExemplos = async (): Promise<Exemplo[]> => {
  /*
   * `orderBy` explícito: o embaralhamento tem semente fixa, mas embaralhar
   * uma lista que chegou em outra ordem produz outra divisão entre treino
   * e validação — e outro modelo. Sem ORDER BY o Postgres não promete
   * ordem nenhuma.
   */
  const interacoes = await prisma.interacaoChat.findMany({
    where: { util: { not: null } },
    orderBy: { id: 'asc' },
    select: { clienteId: true, produtosSugeridos: true, util: true },
  });

  if (interacoes.length === 0) return [];

  const produtos = await prisma.produto.findMany({
    select: {
      id: true,
      marcaId: true,
      especie: true,
      porte: true,
      totalVendido: true,
      categorias: { select: { categoriaId: true } },
    },
  });

  const porId = new Map(
    produtos.map(p => [
      p.id,
      {
        id: p.id,
        marcaId: p.marcaId,
        especie: p.especie,
        porte: p.porte,
        totalVendido: p.totalVendido,
        categoriaIds: p.categorias.map(c => c.categoriaId),
      },
    ]),
  );

  const maiorVenda = Math.max(...produtos.map(p => p.totalVendido), 1);

  // O contexto de cada cliente que aparece nas conversas.
  const clientesNaAmostra = [...new Set(interacoes.map(i => i.clienteId))];
  const contextos = new Map<number, Awaited<ReturnType<typeof contextoDe>>>();

  for (const clienteId of clientesNaAmostra) {
    contextos.set(clienteId, await contextoDe(clienteId));
  }

  const exemplos: Exemplo[] = [];

  for (const interacao of interacoes) {
    const cliente = contextos.get(interacao.clienteId);

    if (!cliente) continue;

    for (const produtoId of interacao.produtosSugeridos) {
      const produto = porId.get(produtoId);

      if (!produto) continue;

      exemplos.push({
        atributos: atributosDe(cliente, produto, maiorVenda),
        rotulo: interacao.util ? 1 : 0,
      });
    }
  }

  return exemplos;
};

/** Preferências e pets do cliente, como o chatModel as lê. */
const contextoDe = async (clienteId: number) => {
  const [pets, itens] = await Promise.all([
    prisma.pet.findMany({
      where: { clienteId },
      select: { especie: true, porte: true },
    }),
    prisma.itemPedido.findMany({
      where: { pedido: { clienteId } },
      select: {
        produtoId: true,
        produto: {
          select: {
            marcaId: true,
            categorias: { select: { categoriaId: true } },
          },
        },
      },
    }),
  ]);

  return {
    pets,
    produtosComprados: [...new Set(itens.map(i => i.produtoId))],
    categoriasPreferidas: porFrequencia(
      itens.flatMap(i => i.produto.categorias.map(c => c.categoriaId)),
    ),
    marcasPreferidas: porFrequencia(itens.map(i => i.produto.marcaId)),
  };
};

/** Descida de gradiente sobre a entropia cruzada, com L2. */
const treinar = (exemplos: Exemplo[]): PesosDoModelo => {
  const modelo: PesosDoModelo = {
    vies: 0,
    pesos: Object.fromEntries(ATRIBUTOS.map(a => [a, 0])) as Record<
      Atributo,
      number
    >,
  };

  for (let epoca = 0; epoca < EPOCAS; epoca += 1) {
    let gradienteVies = 0;
    const gradientes = ATRIBUTOS.map(() => 0);

    for (const exemplo of exemplos) {
      const erro = pontuarComModelo(exemplo.atributos, modelo) - exemplo.rotulo;

      gradienteVies += erro;
      ATRIBUTOS.forEach((_, i) => {
        gradientes[i] += erro * exemplo.atributos[i];
      });
    }

    modelo.vies -= (TAXA * gradienteVies) / exemplos.length;

    ATRIBUTOS.forEach((nome, i) => {
      const comRegularizacao =
        gradientes[i] / exemplos.length + REGULARIZACAO * modelo.pesos[nome];

      modelo.pesos[nome] -= TAXA * comRegularizacao;
    });
  }

  return modelo;
};

const acuracia = (exemplos: Exemplo[], modelo: PesosDoModelo): number => {
  if (exemplos.length === 0) return 0;

  const acertos = exemplos.filter(
    e => (pontuarComModelo(e.atributos, modelo) >= 0.5 ? 1 : 0) === e.rotulo,
  ).length;

  return acertos / exemplos.length;
};

const main = async (): Promise<void> => {
  const exemplos = embaralhar(await montarExemplos());

  if (exemplos.length < 50) {
    throw new Error(
      `Só ${exemplos.length} exemplo(s) avaliados. Rode \`npm run seed\` para ` +
        'carregar o feedback, ou avalie mais respostas no chat.',
    );
  }

  const corte = Math.floor(exemplos.length * (1 - FRACAO_DE_VALIDACAO));
  const treino = exemplos.slice(0, corte);
  const validacao = exemplos.slice(corte);

  const positivos = exemplos.filter(e => e.rotulo === 1).length;

  console.log(
    `Dados: ${exemplos.length} pares (cliente, produto) — ${positivos} de ` +
      `respostas úteis e ${exemplos.length - positivos} de não úteis.`,
  );
  console.log(`Divisão: ${treino.length} para treino, ${validacao.length} para validação.`);

  const modelo = treinar(treino);

  const noTreino = acuracia(treino, modelo);
  const naValidacao = acuracia(validacao, modelo);

  console.log('\nPesos aprendidos:');
  console.log(`  ${'viés'.padEnd(20)} ${modelo.vies.toFixed(3).padStart(7)}`);
  ATRIBUTOS.forEach(nome => {
    console.log(`  ${nome.padEnd(20)} ${modelo.pesos[nome].toFixed(3).padStart(7)}`);
  });

  console.log(
    `\nAcurácia: ${(noTreino * 100).toFixed(1)}% no treino, ` +
      `${(naValidacao * 100).toFixed(1)}% na validação.`,
  );

  const ultima = await prisma.modeloRecomendacao.findFirst({
    orderBy: { versao: 'desc' },
    select: { versao: true },
  });
  const versao = (ultima?.versao ?? 0) + 1;

  await prisma.modeloRecomendacao.create({
    data: {
      versao,
      pesos: modelo as unknown as object,
      exemplos: exemplos.length,
      acuraciaTreino: noTreino,
      acuraciaValidacao: naValidacao,
    },
  });

  console.log(
    `\nVersão ${versao} gravada. O assistente passa a usá-la na próxima pergunta.`,
  );
};

main()
  .catch(erro => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
