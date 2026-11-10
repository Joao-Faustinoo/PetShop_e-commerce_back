/**
 * [MODEL] Limpeza do que os testes criam
 *
 * O QUE FAZ: devolve a base ao conteúdo do seed, removendo os cadastros e
 * as compras que a suíte de ponta a ponta cria e repondo os cupons que ela
 * consome.
 *
 * COMO FARÁ: apaga os clientes cujo e-mail segue o padrão dos testes
 * (`ct01.`, `ct02.`, `teste.`, `novo.`) — telefone, endereços, cartões e
 * pets saem junto, pelo `onDelete: Cascade` do schema. Depois remove os
 * endereços e os cartões que os specs criam no checkout, junto dos pedidos
 * que os referenciam, e devolve os cupons do seed ao estado em que
 * nasceram, descartando os cupons de troca emitidos durante os testes.
 *
 * POR QUE existe: a API não tem DELETE de cliente, e não deve ter — a
 * RF0023 manda inativar, nunca excluir. E o cupom é consumido na compra
 * (RF0037), então sem repor nenhum caso que usa cupom roda duas vezes.
 * Este script é ferramenta de desenvolvimento, roda fora da aplicação e
 * não é uma rota; nenhum cadastro real passa por aqui.
 *
 * USO: `npm run limpar:testes`
 */

import { PrismaClient } from '@prisma/client';

import { cupons as cuponsDoSeed } from './catalogo';

const prisma = new PrismaClient();

/** Os prefixos que os specs usam ao montar e-mails únicos. */
const PREFIXOS_DE_TESTE = ['ct01.', 'ct02.', 'ct02b.', 'teste.', 'novo.'];

/**
 * As marcas que os specs deixam no endereço e no cartão que criam no
 * checkout: `Entrega CT03` e `CLIENTE CT03` vêm do CT-03 de pedidos.cy.ts,
 * `CLIENTE ANALISE` vem das compras que analise.cy.ts faz para provar o
 * efeito de uma venda nova sobre o gráfico.
 */
const APELIDOS_DE_ENDERECO = ['Entrega CT03'];
const NOMES_DE_CARTAO = ['CLIENTE CT03', 'CLIENTE ANALISE'];

const limparClientes = async (): Promise<void> => {
  const alvos = await prisma.cliente.findMany({
    where: {
      OR: PREFIXOS_DE_TESTE.map(prefixo => ({
        email: { startsWith: prefixo },
      })),
    },
    select: { id: true, codigo: true, email: true },
  });

  if (alvos.length === 0) {
    console.log('Clientes: nada a limpar.');

    return;
  }

  alvos.forEach(c => console.log(`  removendo ${c.codigo} — ${c.email}`));
  const { count } = await prisma.cliente.deleteMany({
    where: { id: { in: alvos.map(c => c.id) } },
  });

  console.log(`Clientes: ${count} cadastro(s) de teste removido(s).`);
};

/**
 * Os endereços e os cartões que os specs criam no checkout, mais as
 * compras que os usaram — a compra precisa sair antes, porque Pedido
 * aponta para o endereço e Pagamento aponta para o cartão, e nenhuma das
 * duas relações é em cascata.
 */
const limparCompraDosTestes = async (): Promise<void> => {
  const enderecos = await prisma.endereco.findMany({
    where: { apelido: { in: APELIDOS_DE_ENDERECO } },
    select: { id: true },
  });
  const cartoes = await prisma.cartao.findMany({
    where: { nomeImpresso: { in: NOMES_DE_CARTAO } },
    select: { id: true },
  });

  if (enderecos.length === 0 && cartoes.length === 0) {
    console.log('Checkout: nada a limpar.');

    return;
  }

  const idsEndereco = enderecos.map(e => e.id);
  const idsCartao = cartoes.map(c => c.id);

  const pedidos = await prisma.pedido.findMany({
    where: {
      OR: [
        { enderecoEntregaId: { in: idsEndereco } },
        { pagamentos: { some: { cartaoId: { in: idsCartao } } } },
      ],
    },
    select: { id: true, numero: true },
  });

  if (pedidos.length > 0) {
    await prisma.pedido.deleteMany({ where: { id: { in: pedidos.map(p => p.id) } } });
    console.log(
      `Checkout: ${pedidos.length} pedido(s) de teste removido(s) — ` +
        `${pedidos.map(p => p.numero).join(', ')}.`,
    );
  }

  const { count: cartoesRemovidos } = await prisma.cartao.deleteMany({
    where: { id: { in: idsCartao } },
  });
  const { count: enderecosRemovidos } = await prisma.endereco.deleteMany({
    where: { id: { in: idsEndereco } },
  });

  console.log(
    `Checkout: ${cartoesRemovidos} cartão(ões) e ${enderecosRemovidos} endereço(s) removido(s).`,
  );
};

/**
 * RF0037: a compra aprovada marca o cupom como utilizado, e a RN0036 emite
 * um cupom novo com a sobra. Repor os do seed e descartar os emitidos é o
 * que torna CT-05 e CT-06 re-executáveis.
 */
const reporCupons = async (): Promise<void> => {
  const codigosDoSeed = cuponsDoSeed.map(c => c.codigo);

  // A compra que gastou o cupom sai junto: devolver o cupom e deixar o
  // pedido pago com ele deixaria a base incoerente — o mesmo cupom poderia
  // ser gasto de novo enquanto um pagamento ainda o referencia. Só atinge
  // compras feitas nos testes; as do seed não usam cupom do seed.
  const pedidosComCupomDoSeed = await prisma.pedido.findMany({
    where: { pagamentos: { some: { cupom: { codigo: { in: codigosDoSeed } } } } },
    select: { id: true, numero: true },
  });

  if (pedidosComCupomDoSeed.length > 0) {
    await prisma.pedido.deleteMany({
      where: { id: { in: pedidosComCupomDoSeed.map(p => p.id) } },
    });
    console.log(
      `Cupons: ${pedidosComCupomDoSeed.length} compra(s) paga(s) com cupom removida(s) — ` +
        `${pedidosComCupomDoSeed.map(p => p.numero).join(', ')}.`,
    );
  }

  let repostos = 0;

  for (const cupom of cuponsDoSeed) {
    const { count } = await prisma.cupom.updateMany({
      where: { codigo: cupom.codigo, utilizado: { not: cupom.utilizado } },
      data: { utilizado: cupom.utilizado },
    });
    repostos += count;
  }

  const emitidos = await prisma.cupom.findMany({
    where: { codigo: { notIn: codigosDoSeed }, pagamentos: { none: {} } },
    select: { id: true, codigo: true },
  });

  if (emitidos.length > 0) {
    await prisma.cupom.deleteMany({ where: { id: { in: emitidos.map(c => c.id) } } });
  }

  console.log(
    `Cupons: ${repostos} reposto(s) ao estado do seed, ` +
      `${emitidos.length} emitido(s) nos testes descartado(s).`,
  );
};

const main = async (): Promise<void> => {
  await limparClientes();
  await limparCompraDosTestes();
  await reporCupons();
};

main()
  .catch(erro => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
