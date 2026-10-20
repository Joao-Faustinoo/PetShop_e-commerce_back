/**
 * [MODEL] Carga inicial do banco
 *
 * O QUE FAZ: popula as tabelas de domínio, a base de clientes, o
 * catálogo, o estoque e os cupons na implantação do sistema.
 *
 * COMO FARÁ: insere os registros das tabelas de domínio — grupos de
 * precificação, marcas, categorias, portes, cores, materiais,
 * fornecedores, bandeiras, tipos de residência, logradouro e telefone —,
 * uma base de clientes para exercitar as consultas da RF0024, os 20
 * produtos do catálogo com seus lotes de estoque e os cupons de troca e
 * promocionais. Os dados do catálogo vêm de `./catalogo.ts`, transportados
 * dos mocks do front, para que banco e front mostrem o mesmo acervo.
 *
 * ATENDE: RF0011-RF0016, RF0024, RF0037, RF0045, RN0012, RN0013, RN0036,
 * RN0050, RNF0013
 *
 * ESTADO: falta a carga dos motivos de ativação e inativação de produto,
 * que o schema ainda não modela.
 *
 * A carga é idempotente: `upsert` por id deixa rodar `npm run seed` quantas
 * vezes for preciso sem duplicar linha nem quebrar chave única.
 */

import { Genero, PrismaClient } from '@prisma/client';

import {
  categorias,
  cores,
  cupons,
  fornecedores,
  gruposPrecificacao,
  marcas,
  materiais,
  portes,
  ProdutoSeed,
  produtos,
} from './catalogo';

const prisma = new PrismaClient();

const apenasDigitos = (valor: string): string => valor.replace(/\D/g, '');

/** RNF0035: mesmo formato gerado pelo model — CLI-0000. */
const codigoDe = (id: number): string => `CLI-${String(id).padStart(4, '0')}`;

/** Data a `dias` de hoje, à meia-noite UTC, para as colunas `@db.Date`. */
const emDias = (dias: number): Date => {
  const data = new Date();
  data.setUTCDate(data.getUTCDate() + dias);

  return new Date(data.toISOString().slice(0, 10));
};

/**
 * RN0013: o valor de venda nasce do custo acrescido da margem do grupo de
 * precificação. Calcular aqui — em vez de gravar o preço pronto — faz a
 * carga nascer coerente com a regra, e não com um número transcrito.
 */
const precificar = (valorCusto: number, grupoId: number): number => {
  const grupo = gruposPrecificacao.find(g => g.id === grupoId);
  const margem = grupo?.margemLucro ?? 0;

  return Number((valorCusto * (1 + margem / 100)).toFixed(2));
};

/**
 * RN0050, RN0061 e RN0062: o saldo de um produto é a soma de lotes, e todo
 * lote tem fornecedor, quantidade positiva e custo. Converte o saldo único
 * do catálogo em um ou dois lotes — dois quando há volume para dividir, de
 * modo que a soma exercite o cálculo e não um lote isolado.
 *
 * O id é derivado do produto para a carga continuar idempotente: rodar o
 * seed de novo reescreve os mesmos lotes em vez de empilhar duplicatas.
 */
const lotesDoProduto = (produto: ProdutoSeed) => {
  if (produto.quantidadeEstoque === 0) return [];

  const metade = Math.floor(produto.quantidadeEstoque / 2);
  const quantidades =
    produto.quantidadeEstoque >= 10 && metade > 0
      ? [metade, produto.quantidadeEstoque - metade]
      : [produto.quantidadeEstoque];

  return quantidades.map((quantidade, indice) => ({
    id: produto.id * 10 + indice,
    produtoId: produto.id,
    quantidade,
    valorCusto: produto.valorCusto,
    fornecedorId: ((produto.id + indice) % fornecedores.length) + 1,
    dataEntrada: emDias(-(30 * (indice + 1) + produto.id)),
  }));
};

/**
 * O `id` explícito usado na carga não avança a sequência do Postgres; sem
 * este acerto, o primeiro POST na tabela tentaria reusar o id 1 e colidiria.
 */
const ajustarSequencia = async (tabela: string): Promise<void> => {
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('${tabela}', 'id'), (SELECT COALESCE(MAX(id), 1) FROM ${tabela}))`,
  );
};

// ---------------------------------------------------------------------------
// Tabelas de domínio (RNF0013)
// ---------------------------------------------------------------------------

const tiposTelefone = [
  { id: 1, nome: 'Celular' },
  { id: 2, nome: 'Residencial' },
  { id: 3, nome: 'Comercial' },
];

const tiposResidencia = [
  { id: 1, nome: 'Casa' },
  { id: 2, nome: 'Apartamento' },
  { id: 3, nome: 'Condomínio' },
  { id: 4, nome: 'Comercial' },
];

const tiposLogradouro = [
  { id: 1, nome: 'Rua' },
  { id: 2, nome: 'Avenida' },
  { id: 3, nome: 'Travessa' },
  { id: 4, nome: 'Alameda' },
  { id: 5, nome: 'Praça' },
  { id: 6, nome: 'Rodovia' },
];

/** RN0025: só cartões destas bandeiras podem ser cadastrados. */
const bandeiras = [
  { id: 1, nome: 'Visa' },
  { id: 2, nome: 'Mastercard' },
  { id: 3, nome: 'Elo' },
  { id: 4, nome: 'American Express' },
  { id: 5, nome: 'Hipercard' },
];

// ---------------------------------------------------------------------------
// Clientes — transportados de `../e-commerce/src/mock/clientes/mock.ts`
// ---------------------------------------------------------------------------

interface ClienteSeed {
  id: number;
  nome: string;
  genero: Genero;
  dataNascimento: string;
  cpf: string;
  email: string;
  telefone: { tipoId: number; ddd: string; numero: string };
  ranking: number;
  ativo: boolean;
  justificativaInativacao?: string;
}

const clientes: ClienteSeed[] = [
  {
    id: 1,
    nome: 'João Faustino',
    genero: 'FEMININO',
    dataNascimento: '1994-03-12',
    cpf: '111.444.777-35',
    email: 'user.cliente@email.com',
    telefone: { tipoId: 1, ddd: '11', numero: '988771234' },
    ranking: 5,
    ativo: true,
  },
  {
    id: 2,
    nome: 'Carlos Henrique Moura',
    genero: 'MASCULINO',
    dataNascimento: '1988-07-25',
    cpf: '123.456.789-09',
    email: 'carlos.moura@email.com',
    telefone: { tipoId: 1, ddd: '21', numero: '996548877' },
    ranking: 3,
    ativo: true,
  },
  {
    id: 3,
    nome: 'Mariana Lopes Cardoso',
    genero: 'FEMININO',
    dataNascimento: '1996-11-02',
    cpf: '987.654.321-00',
    email: 'mariana.cardoso@email.com',
    telefone: { tipoId: 1, ddd: '31', numero: '981234455' },
    ranking: 4,
    ativo: true,
  },
  {
    id: 4,
    nome: 'Rodrigo Alves Pinto',
    genero: 'MASCULINO',
    dataNascimento: '1979-01-18',
    cpf: '529.982.247-25',
    email: 'rodrigo.pinto@email.com',
    telefone: { tipoId: 2, ddd: '11', numero: '33445566' },
    ranking: 2,
    ativo: true,
  },
  {
    id: 5,
    nome: 'Juliana Ferreira Dias',
    genero: 'FEMININO',
    dataNascimento: '2000-05-30',
    cpf: '390.533.447-05',
    email: 'juliana.dias@email.com',
    telefone: { tipoId: 1, ddd: '41', numero: '990012233' },
    ranking: 5,
    ativo: true,
  },
  {
    // RF0023: ao menos um inativo, para a consulta por situação ter o que achar.
    id: 6,
    nome: 'Paulo Sérgio Ramos',
    genero: 'MASCULINO',
    dataNascimento: '1985-09-09',
    cpf: '453.178.287-91',
    email: 'paulo.ramos@email.com',
    telefone: { tipoId: 1, ddd: '51', numero: '987651122' },
    ranking: 1,
    ativo: false,
    justificativaInativacao:
      'Cadastro inativado a pedido do titular, por não utilizar mais a loja.',
  },
  {
    id: 7,
    nome: 'Fernanda Souza Lima',
    genero: 'FEMININO',
    dataNascimento: '1992-12-14',
    cpf: '168.995.508-22',
    email: 'fernanda.lima@email.com',
    telefone: { tipoId: 1, ddd: '85', numero: '998876543' },
    ranking: 3,
    ativo: true,
  },
  {
    id: 8,
    nome: 'Bruno Tavares Nogueira',
    genero: 'MASCULINO',
    dataNascimento: '1990-02-28',
    cpf: '693.318.630-04',
    email: 'bruno.nogueira@email.com',
    telefone: { tipoId: 3, ddd: '61', numero: '32229090' },
    ranking: 2,
    ativo: true,
  },
];

/**
 * RN0021/RN0022: todo cliente precisa de um endereço de cobrança e um de
 * entrega. A carga dá o par mínimo a cada um.
 */
const enderecosDe = (clienteId: number) => [
  {
    apelido: 'Casa',
    tipo: 'COBRANCA' as const,
    tipoResidenciaId: 1,
    tipoLogradouroId: 1,
    logradouro: 'das Acácias',
    numero: String(100 + clienteId),
    bairro: 'Centro',
    cep: '01001000',
    cidade: 'São Paulo',
    estado: 'SP',
    pais: 'Brasil',
  },
  {
    apelido: 'Casa',
    tipo: 'ENTREGA' as const,
    tipoResidenciaId: 1,
    tipoLogradouroId: 1,
    logradouro: 'das Acácias',
    numero: String(100 + clienteId),
    bairro: 'Centro',
    cep: '01001000',
    cidade: 'São Paulo',
    estado: 'SP',
    pais: 'Brasil',
  },
];

// ---------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------

const carregarDominios = async (): Promise<void> => {
  for (const item of tiposTelefone) {
    await prisma.tipoTelefone.upsert({
      where: { id: item.id },
      update: { nome: item.nome },
      create: item,
    });
  }

  for (const item of tiposResidencia) {
    await prisma.tipoResidencia.upsert({
      where: { id: item.id },
      update: { nome: item.nome },
      create: item,
    });
  }

  for (const item of tiposLogradouro) {
    await prisma.tipoLogradouro.upsert({
      where: { id: item.id },
      update: { nome: item.nome },
      create: item,
    });
  }

  for (const item of bandeiras) {
    await prisma.bandeiraCartao.upsert({
      where: { id: item.id },
      update: { nome: item.nome },
      create: item,
    });
  }

  console.log(
    `Domínios: ${tiposTelefone.length} tipos de telefone, ` +
      `${tiposResidencia.length} tipos de residência, ` +
      `${tiposLogradouro.length} tipos de logradouro, ` +
      `${bandeiras.length} bandeiras.`,
  );
};

const carregarClientes = async (): Promise<void> => {
  for (const cliente of clientes) {
    const dados = {
      codigo: codigoDe(cliente.id),
      nome: cliente.nome,
      genero: cliente.genero,
      dataNascimento: new Date(`${cliente.dataNascimento}T00:00:00Z`),
      cpf: apenasDigitos(cliente.cpf),
      email: cliente.email,
      ranking: cliente.ranking,
      ativo: cliente.ativo,
      justificativaInativacao: cliente.justificativaInativacao ?? null,
    };

    await prisma.cliente.upsert({
      where: { id: cliente.id },
      update: dados,
      create: {
        id: cliente.id,
        ...dados,
        telefone: { create: cliente.telefone },
        enderecos: { create: enderecosDe(cliente.id) },
      },
    });
  }

  await ajustarSequencia('cliente');

  console.log(`Clientes: ${clientes.length} cadastrados, cada um com telefone e 2 endereços.`);
};

/**
 * As 7 tabelas de domínio que o produto referencia. Entram antes do
 * catálogo porque são as chaves estrangeiras dele.
 */
const carregarDominiosDoCatalogo = async (): Promise<void> => {
  for (const item of gruposPrecificacao) {
    await prisma.grupoPrecificacao.upsert({
      where: { id: item.id },
      update: { nome: item.nome, margemLucro: item.margemLucro },
      create: item,
    });
  }

  for (const item of marcas) {
    await prisma.marca.upsert({ where: { id: item.id }, update: item, create: item });
  }

  for (const item of categorias) {
    await prisma.categoria.upsert({ where: { id: item.id }, update: item, create: item });
  }

  for (const item of cores) {
    await prisma.cor.upsert({ where: { id: item.id }, update: item, create: item });
  }

  for (const item of materiais) {
    await prisma.material.upsert({ where: { id: item.id }, update: item, create: item });
  }

  for (const item of portes) {
    await prisma.porte.upsert({ where: { id: item.id }, update: item, create: item });
  }

  for (const item of fornecedores) {
    await prisma.fornecedor.upsert({ where: { id: item.id }, update: item, create: item });
  }

  for (const tabela of [
    'grupo_precificacao',
    'marca',
    'categoria',
    'cor',
    'material',
    'porte',
    'fornecedor',
  ]) {
    await ajustarSequencia(tabela);
  }

  console.log(
    `Domínios do catálogo: ${gruposPrecificacao.length} grupos de precificação, ` +
      `${marcas.length} marcas, ${categorias.length} categorias, ${cores.length} cores, ` +
      `${materiais.length} materiais, ${portes.length} portes, ` +
      `${fornecedores.length} fornecedores.`,
  );
};

const carregarProdutos = async (): Promise<void> => {
  for (const produto of produtos) {
    const dados = {
      sku: produto.sku,
      nome: produto.nome,
      descricao: produto.descricao,
      marcaId: produto.marcaId,
      especie: produto.especie,
      porte: produto.porte,
      corId: produto.corId,
      materialId: produto.materialId,
      altura: produto.altura,
      largura: produto.largura,
      profundidade: produto.profundidade,
      peso: produto.peso,
      codigoBarras: produto.codigoBarras,
      grupoPrecificacaoId: produto.grupoPrecificacaoId,
      valorCusto: produto.valorCusto,
      valorVenda: precificar(produto.valorCusto, produto.grupoPrecificacaoId),
      ativo: produto.ativo,
      // Convenção do front: o arquivo em public/produtos leva o nome do SKU.
      imagem: `/produtos/${produto.sku}.png`,
      totalVendido: produto.totalVendido,
    };

    await prisma.produto.upsert({
      where: { id: produto.id },
      update: dados,
      create: { id: produto.id, ...dados },
    });

    // RN0012: as categorias são reescritas por inteiro, e não acumuladas,
    // para a carga continuar idempotente quando a lista mudar.
    await prisma.produtoCategoria.deleteMany({ where: { produtoId: produto.id } });
    await prisma.produtoCategoria.createMany({
      data: produto.categoriaIds.map(categoriaId => ({
        produtoId: produto.id,
        categoriaId,
      })),
    });
  }

  await ajustarSequencia('produto');

  const ativos = produtos.filter(p => p.ativo).length;
  console.log(
    `Catálogo: ${produtos.length} produtos (${ativos} ativos, ` +
      `${produtos.length - ativos} inativos), com preço calculado pela RN0013.`,
  );
};

const carregarEstoque = async (): Promise<void> => {
  const lotes = produtos.flatMap(lotesDoProduto);

  for (const lote of lotes) {
    const { id, ...dados } = lote;
    await prisma.itemEstoque.upsert({
      where: { id },
      update: dados,
      create: lote,
    });
  }

  await ajustarSequencia('item_estoque');

  const saldo = lotes.reduce((total, lote) => total + lote.quantidade, 0);
  const semSaldo = produtos.filter(p => p.quantidadeEstoque === 0).length;
  console.log(
    `Estoque: ${lotes.length} lotes somando ${saldo} unidades; ` +
      `${semSaldo} produtos entram sem saldo, para a RN0031 ter o que barrar.`,
  );
};

const carregarCupons = async (): Promise<void> => {
  for (const cupom of cupons) {
    const dados = {
      codigo: cupom.codigo,
      tipo: cupom.tipo,
      valor: cupom.valor,
      validade: emDias(cupom.validadeEmDias),
      utilizado: cupom.utilizado,
      clienteId: cupom.clienteId,
    };

    await prisma.cupom.upsert({
      where: { id: cupom.id },
      update: dados,
      create: { id: cupom.id, ...dados },
    });
  }

  await ajustarSequencia('cupom');

  const troca = cupons.filter(c => c.tipo === 'TROCA').length;
  const vencidos = cupons.filter(c => c.validadeEmDias < 0).length;
  console.log(
    `Cupons: ${troca} de troca e ${cupons.length - troca} promocionais, ` +
      `sendo ${vencidos} já vencidos para exercitar a RN0035.`,
  );
};

const main = async (): Promise<void> => {
  await carregarDominios();
  await carregarClientes();
  await carregarDominiosDoCatalogo();
  await carregarProdutos();
  await carregarEstoque();
  await carregarCupons();
};

main()
  .then(() => console.log('Carga inicial concluída.'))
  .catch(erro => {
    console.error('Falha na carga inicial:', erro);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
