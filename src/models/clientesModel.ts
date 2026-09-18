/**
 * [MODEL] Model de clientes
 *
 * O QUE FAZ: consulta com filtros, grava e altera o cliente e seus dados
 * pessoais.
 *
 * COMO FARÁ: usa o cliente do Prisma e devolve os dados já no formato dos
 * tipos do domínio. Não aplica regra de negócio: essa responsabilidade é
 * do service.
 *
 * ATENDE: RF0021-RF0025, RNF0035
 */

import { Prisma } from '@prisma/client';

import { prisma } from '../config/prisma';
import { Cartao } from '../types/cartoes/types';
import {
  Cliente,
  ClienteBase,
  ClienteFiltros,
  Telefone,
} from '../types/clientes/types';
import { Paginacao } from '../types/common/types';
import { Endereco } from '../types/enderecos/types';
import { Pet } from '../types/pets/types';
import { recorte } from '../utils/paginacao';

/** O cliente sempre viaja com o telefone; é parte do seu registro (RN0026). */
const comTelefone = { telefone: true } as const;

/** O detalhe agrega as coleções que o front exibe na tela de cadastro. */
const comTudo = {
  telefone: true,
  enderecos: { orderBy: { id: 'asc' } },
  cartoes: { orderBy: { id: 'asc' } },
  pets: { orderBy: { id: 'asc' } },
} as const satisfies Prisma.ClienteInclude;

type LinhaBase = Prisma.ClienteGetPayload<{ include: typeof comTelefone }>;
type LinhaCompleta = Prisma.ClienteGetPayload<{ include: typeof comTudo }>;

// ---------------------------------------------------------------------------
// Conversão entre a linha do banco e o tipo do domínio
// ---------------------------------------------------------------------------

/** `@db.Date` volta como Date em UTC; o contrato do front é AAAA-MM-DD. */
const paraDataIso = (data: Date): string => data.toISOString().slice(0, 10);

/** O banco guarda só dígitos; a saída usa a máscara que o front exibe. */
const formatarCpf = (digitos: string): string =>
  digitos.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');

const paraTelefone = (linha: LinhaBase['telefone']): Telefone =>
  linha
    ? { tipoId: linha.tipoId, ddd: linha.ddd, numero: linha.numero }
    : // Só ocorre em base inconsistente: o cadastro sempre grava o telefone.
      { tipoId: 0, ddd: '', numero: '' };

const paraEndereco = (linha: LinhaCompleta['enderecos'][number]): Endereco => ({
  id: linha.id,
  clienteId: linha.clienteId,
  apelido: linha.apelido,
  tipo: linha.tipo,
  tipoResidenciaId: linha.tipoResidenciaId,
  tipoLogradouroId: linha.tipoLogradouroId,
  logradouro: linha.logradouro,
  numero: linha.numero,
  bairro: linha.bairro,
  cep: linha.cep,
  cidade: linha.cidade,
  estado: linha.estado,
  pais: linha.pais,
  observacoes: linha.observacoes ?? undefined,
});

const paraCartao = (linha: LinhaCompleta['cartoes'][number]): Cartao => ({
  id: linha.id,
  clienteId: linha.clienteId,
  numero: linha.numero,
  nomeImpresso: linha.nomeImpresso,
  bandeiraId: linha.bandeiraId,
  codigoSeguranca: linha.codigoSeguranca,
  preferencial: linha.preferencial,
});

const paraPet = (linha: LinhaCompleta['pets'][number]): Pet => ({
  id: linha.id,
  clienteId: linha.clienteId,
  nome: linha.nome,
  especie: linha.especie,
  raca: linha.raca,
  porte: linha.porte,
  // Decimal preserva a precisão no banco, mas o contrato do front é number.
  peso: linha.peso.toNumber(),
});

const paraClienteBase = (linha: LinhaBase): ClienteBase => ({
  id: linha.id,
  codigo: linha.codigo,
  nome: linha.nome,
  genero: linha.genero,
  dataNascimento: paraDataIso(linha.dataNascimento),
  cpf: formatarCpf(linha.cpf),
  email: linha.email,
  telefone: paraTelefone(linha.telefone),
  ranking: linha.ranking,
  ativo: linha.ativo,
  justificativaInativacao: linha.justificativaInativacao ?? undefined,
});

const paraCliente = (linha: LinhaCompleta): Cliente => ({
  ...paraClienteBase(linha),
  enderecos: linha.enderecos.map(paraEndereco),
  cartoes: linha.cartoes.map(paraCartao),
  pets: linha.pets.map(paraPet),
});

// ---------------------------------------------------------------------------
// Filtros
// ---------------------------------------------------------------------------

/**
 * RF0024: cada campo preenchido acrescenta uma condição, todas combinadas
 * com AND. Texto é comparado sem diferenciar maiúsculas; CPF é comparado
 * só pelos dígitos, como o banco o armazena.
 */
const montarWhere = (filtros: ClienteFiltros): Prisma.ClienteWhereInput => {
  const where: Prisma.ClienteWhereInput = {};

  if (filtros.nome) {
    where.nome = { contains: filtros.nome, mode: 'insensitive' };
  }
  if (filtros.codigo) {
    where.codigo = { contains: filtros.codigo, mode: 'insensitive' };
  }
  if (filtros.cpf) {
    where.cpf = { contains: filtros.cpf.replace(/\D/g, '') };
  }
  if (filtros.email) {
    where.email = { contains: filtros.email, mode: 'insensitive' };
  }
  if (filtros.genero) where.genero = filtros.genero;
  if (filtros.rankingMinimo !== undefined) {
    where.ranking = { gte: filtros.rankingMinimo };
  }
  if (filtros.ativo !== undefined) where.ativo = filtros.ativo;

  return where;
};

// ---------------------------------------------------------------------------
// Operações
// ---------------------------------------------------------------------------

export interface DadosPessoais {
  nome: string;
  genero: Cliente['genero'];
  dataNascimento: string;
  /** Já normalizado pelo service: só dígitos. */
  cpf: string;
  email: string;
  telefone: Telefone;
}

export interface DadosEndereco extends Omit<Endereco, 'id' | 'clienteId'> {}

export const clientesModel = {
  async listar(
    filtros: ClienteFiltros,
    paginacao: Paginacao,
  ): Promise<{ itens: ClienteBase[]; total: number }> {
    const where = montarWhere(filtros);

    // As duas consultas na mesma transação para que o total não descreva um
    // estado diferente do que a página devolveu.
    const [linhas, total] = await prisma.$transaction([
      prisma.cliente.findMany({
        where,
        include: comTelefone,
        orderBy: { nome: 'asc' },
        ...recorte(paginacao),
      }),
      prisma.cliente.count({ where }),
    ]);

    return { itens: linhas.map(paraClienteBase), total };
  },

  async buscarPorId(id: number): Promise<Cliente | null> {
    const linha = await prisma.cliente.findUnique({
      where: { id },
      include: comTudo,
    });

    return linha ? paraCliente(linha) : null;
  },

  /** Usado pelo service para checar duplicidade antes de gravar. */
  async buscarIdPorCpf(cpf: string): Promise<number | null> {
    const linha = await prisma.cliente.findUnique({
      where: { cpf },
      select: { id: true },
    });

    return linha?.id ?? null;
  },

  async buscarIdPorEmail(email: string): Promise<number | null> {
    const linha = await prisma.cliente.findUnique({
      where: { email },
      select: { id: true },
    });

    return linha?.id ?? null;
  },

  /**
   * RN0021/RN0022: cliente, telefone e os dois endereços nascem juntos, em
   * uma única transação — um cadastro sem endereço de entrega seria
   * inválido pelo DRS.
   *
   * RNF0035: o código sai do id gerado, então é atribuído logo após a
   * inserção, ainda dentro da transação. Deriva-lo do id (em vez de contar
   * as linhas) mantém a unicidade mesmo com dois cadastros simultâneos.
   */
  async criar(
    dados: DadosPessoais,
    enderecoCobranca: DadosEndereco,
    enderecoEntrega: DadosEndereco,
  ): Promise<Cliente> {
    const linha = await prisma.$transaction(async tx => {
      const criado = await tx.cliente.create({
        data: {
          // Provisório e único, substituído duas linhas abaixo.
          codigo: `TMP-${randomicoCurto()}`,
          nome: dados.nome,
          genero: dados.genero,
          dataNascimento: new Date(`${dados.dataNascimento}T00:00:00Z`),
          cpf: dados.cpf,
          email: dados.email,
          telefone: { create: dados.telefone },
          enderecos: {
            create: [
              { ...enderecoCobranca, tipo: 'COBRANCA' },
              { ...enderecoEntrega, tipo: 'ENTREGA' },
            ],
          },
        },
        select: { id: true },
      });

      return tx.cliente.update({
        where: { id: criado.id },
        data: { codigo: gerarCodigo(criado.id) },
        include: comTudo,
      });
    });

    return paraCliente(linha);
  },

  async atualizar(id: number, dados: DadosPessoais): Promise<Cliente> {
    const linha = await prisma.cliente.update({
      where: { id },
      data: {
        nome: dados.nome,
        genero: dados.genero,
        dataNascimento: new Date(`${dados.dataNascimento}T00:00:00Z`),
        cpf: dados.cpf,
        email: dados.email,
        // `upsert` cobre o cadastro legado que porventura não tenha telefone.
        telefone: {
          upsert: { create: dados.telefone, update: dados.telefone },
        },
      },
      include: comTudo,
    });

    return paraCliente(linha);
  },

  /** RF0023: o cadastro nunca é apagado, só muda de situação. */
  async alterarSituacao(
    id: number,
    ativo: boolean,
    justificativa: string,
  ): Promise<Cliente> {
    const linha = await prisma.cliente.update({
      where: { id },
      data: { ativo, justificativaInativacao: justificativa },
      include: comTudo,
    });

    return paraCliente(linha);
  },

  /** RN0027: gravado pelo service depois de recalcular a nota. */
  async atualizarRanking(id: number, ranking: number): Promise<Cliente> {
    const linha = await prisma.cliente.update({
      where: { id },
      data: { ranking },
      include: comTudo,
    });

    return paraCliente(linha);
  },
};

/** RNF0035: código único sequencial no formato CLI-0000. */
export const gerarCodigo = (id: number): string =>
  `CLI-${String(id).padStart(4, '0')}`;

const randomicoCurto = (): string =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
