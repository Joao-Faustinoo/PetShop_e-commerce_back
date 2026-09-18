/**
 * [MODEL] Carga inicial do banco
 *
 * O QUE FAZ: popula as tabelas de domínio na implantação do sistema.
 *
 * COMO FARÁ: insere os registros das 14 tabelas de domínio — grupos de
 * precificação, marcas, categorias, espécies, portes, cores, materiais,
 * fornecedores, bandeiras, tipos de residência, logradouro e telefone, e
 * motivos de ativação e inativação. O conteúdo pode ser transportado de
 * `../e-commerce/src/mock/dominios/mock.ts`, que já o contém.
 *
 * ATENDE: RNF0013
 *
 * ESTADO: seguem as 4 tabelas de domínio que o recorte de clientes
 * referencia, mais uma base de clientes para exercitar as consultas da
 * RF0024. As outras 10 tabelas entram junto com as fatias que as usam —
 * seriam órfãs enquanto Produto e Estoque não existirem no schema.
 *
 * A carga é idempotente: `upsert` por id deixa rodar `npm run seed` quantas
 * vezes for preciso sem duplicar linha nem quebrar chave única.
 */

import { Genero, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const apenasDigitos = (valor: string): string => valor.replace(/\D/g, '');

/** RNF0035: mesmo formato gerado pelo model — CLI-0000. */
const codigoDe = (id: number): string => `CLI-${String(id).padStart(4, '0')}`;

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

  // O `id` explícito acima não avança a sequência do Postgres; sem este
  // acerto, o primeiro POST /clientes tentaria reusar o id 1 e colidiria.
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('cliente', 'id'), (SELECT COALESCE(MAX(id), 1) FROM cliente))`,
  );

  console.log(`Clientes: ${clientes.length} cadastrados, cada um com telefone e 2 endereços.`);
};

const main = async (): Promise<void> => {
  await carregarDominios();
  await carregarClientes();
};

main()
  .then(() => console.log('Carga inicial concluída.'))
  .catch(erro => {
    console.error('Falha na carga inicial:', erro);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
