/**
 * [MODEL] Tipos de log de transações
 *
 * O QUE FAZ: define o contrato de dados de log de transações.
 *
 * COMO FARÁ: declara as interfaces de entidade e os filtros de consulta.
 * Só interfaces, sem lógica — é o mesmo contrato que o front consome, para
 * as duas pontas não divergirem. Portado de
 * `../e-commerce/src/types/log/types.ts`.
 *
 * O `usuarioNome` é derivado na leitura: o banco guarda só o id, e o nome
 * é buscado no cadastro de clientes na hora de montar a resposta. Guardá-lo
 * no registro congelaria um nome que o cliente pode ter alterado depois.
 *
 * ATENDE: RNF0012
 */

export type OperacaoLog = 'INSERCAO' | 'ALTERACAO';

export interface CampoAlterado {
  campo: string;
  de: unknown;
  para: unknown;
}

export interface LogTransacao {
  id: number;
  dataHora: string;
  usuarioId: number;
  usuarioNome: string;
  entidade: string;
  entidadeId: number;
  operacao: OperacaoLog;
  /** Vazio nas inserções; nas alterações traz o antes/depois de cada campo. */
  dadosAlterados: CampoAlterado[];
}

export interface LogFiltros {
  entidade?: string;
  entidadeId?: number;
  usuarioId?: number;
  operacao?: OperacaoLog;
  /** Recorte por data, no formato AAAA-MM-DD. */
  de?: string;
  ate?: string;
}
