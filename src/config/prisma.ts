/**
 * [MODEL] Cliente do Prisma
 *
 * O QUE FAZ: expõe uma única instância do cliente do banco para toda a
 * aplicação.
 *
 * COMO FARÁ: instancia o PrismaClient uma vez e o reexporta. Instância
 * única porque cada uma abre seu próprio pool de conexões.
 */

import { PrismaClient } from '@prisma/client';

/**
 * Em desenvolvimento o tsx recarrega os módulos a cada alteração; guardar a
 * instância no escopo global evita abrir um pool novo a cada reload.
 */
const globalParaPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

export const prisma =
  globalParaPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalParaPrisma.prisma = prisma;
}
