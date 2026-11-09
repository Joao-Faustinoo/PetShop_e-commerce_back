/**
 * [MODEL] Transação
 *
 * O QUE FAZ: dá ao service uma forma de abrir transação sem conhecer o
 * Prisma, e nomeia o tipo de quem executa uma consulta.
 *
 * COMO FARÁ: `executarEmTransacao` repassa o callback ao `$transaction` do
 * cliente único, entregando o `tx` que os models recebem. `Executor` é o
 * que uma função de model aceita: ou o cliente normal, ou o `tx` de uma
 * transação em andamento — é o que permite a mesma função servir dentro e
 * fora de uma transação.
 *
 * POR QUE existe: a camada de service aplica as regras do DRS e não deve
 * falar com o banco. Sem isto, abrir uma transação obrigaria o service a
 * importar o Prisma só para isso, e a fronteira entre as camadas ficaria
 * furada no ponto mais importante — o checkout, onde pedido, estoque,
 * cupom e pagamento precisam valer ou falhar juntos.
 *
 * ATENDE: RNF0012
 */

import { Prisma } from '@prisma/client';

import { prisma } from '../config/prisma';

/** Quem executa uma consulta: o cliente único ou o `tx` de uma transação. */
export type Executor = Prisma.TransactionClient | typeof prisma;

/** Roda o callback dentro de uma transação: ou tudo vale, ou nada vale. */
export const executarEmTransacao = <T>(
  operacao: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> => prisma.$transaction(operacao);
