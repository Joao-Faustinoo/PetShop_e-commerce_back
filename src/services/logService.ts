/**
 * [MODEL] Service de log de transações
 *
 * O QUE FAZ: entrega o registro das operações de escrita do sistema.
 *
 * COMO FARÁ: lê o model e devolve a página. A gravação não passa por aqui:
 * quem registra é o service de cada domínio, de dentro da própria
 * transação, para que o registro e o dado registrado valham ou falhem
 * juntos. Este service é só a consulta.
 *
 * ATENDE: RNF0012
 */

import { logModel } from '../models/logModel';
import { Pagina, Paginacao } from '../types/common/types';
import { LogFiltros, LogTransacao } from '../types/log/types';
import { ApiError } from '../utils/ApiError';
import { montarPagina } from '../utils/paginacao';

export const logService = {
  async listar(
    filtros: LogFiltros,
    paginacao: Paginacao,
  ): Promise<Pagina<LogTransacao>> {
    if (filtros.de && filtros.ate && filtros.de > filtros.ate) {
      throw ApiError.requisicaoInvalida(
        'A data inicial não pode ser posterior à final.',
      );
    }

    const { itens, total } = await logModel.listar(filtros, paginacao);

    return montarPagina(itens, total, paginacao);
  },
};
