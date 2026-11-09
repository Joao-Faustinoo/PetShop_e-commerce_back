/**
 * [MODEL] Model de log de transações
 *
 * O QUE FAZ: grava quem alterou o quê, quando, e como o dado estava antes.
 *
 * COMO FARÁ: uma linha por operação de escrita, com os dados anteriores e
 * os novos em JSON. Recebe o executor por parâmetro para poder ser
 * chamado de dentro da transação do checkout: o registro só existe se a
 * operação existir.
 *
 * O histórico de status de um pedido é lido daqui, em vez de ter tabela
 * própria — a informação é a mesma, e assim não há dois lugares para
 * desencontrar.
 *
 * ATENDE: RNF0012
 */

import { Prisma } from '@prisma/client';

import { prisma } from '../config/prisma';
import { Paginacao } from '../types/common/types';
import {
  CampoAlterado,
  LogFiltros,
  LogTransacao,
  OperacaoLog,
} from '../types/log/types';
import { HistoricoStatus, StatusPedido } from '../types/pedidos/types';
import { recorte } from '../utils/paginacao';
import { Executor } from '../utils/transacao';


export type Operacao = 'INSERCAO' | 'ALTERACAO';

interface RegistroLog {
  usuarioId: number;
  operacao: Operacao;
  entidade: string;
  entidadeId: string | number;
  antes?: unknown;
  depois?: unknown;
}

/**
 * O que mudou entre o antes e o depois. Numa inserção não há antes, então
 * a lista sai vazia — o dado novo inteiro está no registro.
 */
const camposAlterados = (
  anteriores: Prisma.JsonValue,
  novos: Prisma.JsonValue,
): CampoAlterado[] => {
  const antes = (anteriores ?? {}) as Record<string, unknown>;
  const depois = (novos ?? {}) as Record<string, unknown>;

  if (anteriores === null) return [];

  return [...new Set([...Object.keys(antes), ...Object.keys(depois)])]
    .filter(campo => JSON.stringify(antes[campo]) !== JSON.stringify(depois[campo]))
    .map(campo => ({ campo, de: antes[campo], para: depois[campo] }));
};

/** JSON do Prisma não aceita `undefined`; vira ausência de valor. */
const paraJson = (valor: unknown): Prisma.InputJsonValue | undefined =>
  valor === undefined ? undefined : (JSON.parse(JSON.stringify(valor)) as Prisma.InputJsonValue);

export const logModel = {
  async registrar(
    { usuarioId, operacao, entidade, entidadeId, antes, depois }: RegistroLog,
    tx: Executor = prisma,
  ): Promise<void> {
    await tx.logTransacao.create({
      data: {
        usuarioId,
        operacao,
        entidade,
        entidadeId: String(entidadeId),
        dadosAnteriores: paraJson(antes),
        dadosNovos: paraJson(depois),
      },
    });
  },

  /**
   * RNF0012: a consulta do registro. Os campos alterados são derivados na
   * leitura, comparando o antes e o depois guardados — gravá-los já
   * comparados duplicaria o dado e envelheceria se a comparação mudasse.
   */
  async listar(
    filtros: LogFiltros,
    paginacao: Paginacao,
  ): Promise<{ itens: LogTransacao[]; total: number }> {
    const where: Prisma.LogTransacaoWhereInput = {
      ...(filtros.entidade && { entidade: filtros.entidade }),
      ...(filtros.entidadeId !== undefined && {
        entidadeId: String(filtros.entidadeId),
      }),
      ...(filtros.usuarioId !== undefined && { usuarioId: filtros.usuarioId }),
      ...(filtros.operacao && { operacao: filtros.operacao }),
      ...((filtros.de || filtros.ate) && {
        dataHora: {
          ...(filtros.de && { gte: new Date(`${filtros.de}T00:00:00.000Z`) }),
          ...(filtros.ate && { lte: new Date(`${filtros.ate}T23:59:59.999Z`) }),
        },
      }),
    };

    // A página e o total saem na mesma transação: um registro gravado
    // entre as duas consultas faria o total descrever outro estado.
    const [linhas, total] = await prisma.$transaction([
      prisma.logTransacao.findMany({
        where,
        orderBy: { dataHora: 'desc' },
        ...recorte(paginacao),
      }),
      prisma.logTransacao.count({ where }),
    ]);

    // O nome vem do cadastro, e não do registro: guardá-lo congelaria um
    // nome que o cliente pode ter alterado depois.
    const ids = [...new Set(linhas.map(l => l.usuarioId))];
    const clientes = await prisma.cliente.findMany({
      where: { id: { in: ids } },
      select: { id: true, nome: true },
    });
    const nomePorId = new Map(clientes.map(c => [c.id, c.nome]));

    return {
      itens: linhas.map(l => ({
        id: l.id,
        dataHora: l.dataHora.toISOString(),
        usuarioId: l.usuarioId,
        usuarioNome: nomePorId.get(l.usuarioId) ?? 'Administrador',
        entidade: l.entidade,
        entidadeId: Number(l.entidadeId),
        operacao: l.operacao as OperacaoLog,
        dadosAlterados: camposAlterados(l.dadosAnteriores, l.dadosNovos),
      })),
      total,
    };
  },

  /**
   * O caminho de um pedido entre os status, montado a partir do que foi
   * registrado. A primeira linha é a criação; as seguintes, as mudanças.
   */
  async historicoDoPedido(pedidoId: number): Promise<HistoricoStatus[]> {
    const linhas = await prisma.logTransacao.findMany({
      where: { entidade: 'Pedido', entidadeId: String(pedidoId) },
      orderBy: { dataHora: 'asc' },
    });

    return linhas
      .map(linha => {
        const novos = linha.dadosNovos as { status?: StatusPedido } | null;

        return novos?.status
          ? {
              status: novos.status,
              dataHora: linha.dataHora.toISOString(),
              usuarioId: linha.usuarioId,
            }
          : null;
      })
      .filter((h): h is HistoricoStatus => h !== null);
  },
};
