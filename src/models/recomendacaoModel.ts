/**
 * [MODEL] Model do recomendador treinado
 *
 * O QUE FAZ: entrega ao service a versão mais recente do modelo treinado.
 *
 * COMO FARÁ: lê a última linha de `modelo_recomendacao` e confere se os
 * pesos batem com os atributos desta versão do código. Um modelo treinado
 * antes de a lista de atributos mudar é RECUSADO, não aplicado pela
 * metade: aplicar pesos de outra conta seria pior que não usar modelo
 * nenhum, porque a recomendação pareceria treinada sem estar.
 *
 * O resultado fica em cache por alguns segundos. Sem cache, toda pergunta
 * ao assistente faria uma consulta a mais para ler a mesma linha; com
 * cache eterno, treinar de novo não teria efeito sem reiniciar a API — e
 * a demonstração de "novos dados entram no modelo" morreria aí.
 *
 * ATENDE: RNF0047
 */

import { prisma } from '../config/prisma';
import { PesosDoModelo, pesosValidos } from '../utils/recomendacao';
import { Executor } from '../utils/transacao';

export interface ModeloTreinado {
  versao: number;
  pesos: PesosDoModelo;
  exemplos: number;
  acuraciaValidacao: number;
  treinadoEm: string;
}

/** Quanto tempo o modelo fica em memória antes de ser relido do banco. */
const VALIDADE_DO_CACHE_MS = 10_000;

let cache: { em: number; modelo: ModeloTreinado | null } | undefined;

export const recomendacaoModel = {
  /** A versão mais recente, ou `null` se ainda não houve treino. */
  async maisRecente(tx: Executor = prisma): Promise<ModeloTreinado | null> {
    if (cache && Date.now() - cache.em < VALIDADE_DO_CACHE_MS) {
      return cache.modelo;
    }

    const linha = await tx.modeloRecomendacao.findFirst({
      orderBy: { versao: 'desc' },
    });

    const modelo =
      linha && pesosValidos(linha.pesos)
        ? {
            versao: linha.versao,
            pesos: linha.pesos,
            exemplos: linha.exemplos,
            acuraciaValidacao: linha.acuraciaValidacao,
            treinadoEm: linha.treinadoEm.toISOString(),
          }
        : null;

    cache = { em: Date.now(), modelo };

    return modelo;
  },

  /** Usado pelos testes e pelo seed, que mexem na tabela por fora. */
  esquecerCache(): void {
    cache = undefined;
  },
};
