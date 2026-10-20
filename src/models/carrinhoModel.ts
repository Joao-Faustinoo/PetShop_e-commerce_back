/**
 * [MODEL] Model de carrinho
 *
 * O QUE FAZ: guarda os itens que o cliente separou para comprar e colhe os
 * que passaram do prazo de bloqueio.
 *
 * COMO FARÁ: cada cliente tem um carrinho só, criado na primeira adição.
 * O prazo do bloqueio corre a partir do último item incluído — por isso
 * toda escrita renova `atualizadoEm`. Quando o prazo passa, os itens são
 * marcados com `expiradoEm`: deixam de bloquear estoque, mas continuam na
 * lista para a RNF0042 poder exibi-los e o cliente poder devolvê-los.
 *
 * ATENDE: RF0031, RF0032, RN0044, RNF0042
 */

import { Prisma } from '@prisma/client';

import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { limiteDeBloqueio } from './estoqueModel';

const comProduto = {
  itens: {
    include: { produto: { include: { categorias: { select: { categoriaId: true } } } } },
    orderBy: { id: 'asc' },
  },
} as const satisfies Prisma.CarrinhoInclude;

export type CarrinhoCompleto = Prisma.CarrinhoGetPayload<{
  include: typeof comProduto;
}>;

export const carrinhoModel = {
  /** O carrinho nasce na primeira adição; ler não cria nada. */
  async buscar(clienteId: number): Promise<CarrinhoCompleto | null> {
    return prisma.carrinho.findUnique({
      where: { clienteId },
      include: comProduto,
    });
  },

  async garantir(clienteId: number): Promise<CarrinhoCompleto> {
    return prisma.carrinho.upsert({
      where: { clienteId },
      create: { clienteId },
      update: {},
      include: comProduto,
    });
  },

  /**
   * RN0044: marca como expirados os itens de um carrinho cujo prazo passou.
   * É feito na leitura e antes de cada escrita, em vez de por tarefa
   * agendada: o efeito só precisa existir quando alguém olha.
   *
   * Devolve quantos itens foram colhidos agora.
   */
  async colherExpirados(clienteId: number): Promise<number> {
    const carrinho = await prisma.carrinho.findUnique({
      where: { clienteId },
      select: { id: true, atualizadoEm: true },
    });

    if (!carrinho) return 0;
    if (carrinho.atualizadoEm > limiteDeBloqueio()) return 0;

    const { count } = await prisma.itemCarrinho.updateMany({
      where: { carrinhoId: carrinho.id, expiradoEm: null },
      data: { expiradoEm: new Date() },
    });

    return count;
  },

  /**
   * RF0031/RF0032: inclui o item ou soma à quantidade existente. Renovar
   * `atualizadoEm` é o que faz o prazo contar a partir do último item.
   */
  async salvarItem(
    clienteId: number,
    produtoId: number,
    quantidade: number,
    valorUnitario: number,
  ): Promise<void> {
    const carrinho = await this.garantir(clienteId);

    await prisma.$transaction([
      prisma.itemCarrinho.upsert({
        where: { carrinhoId_produtoId: { carrinhoId: carrinho.id, produtoId } },
        create: { carrinhoId: carrinho.id, produtoId, quantidade, valorUnitario },
        // Devolver um item expirado o traz de volta ao bloqueio (RNF0042).
        update: { quantidade, valorUnitario, expiradoEm: null },
      }),
      prisma.carrinho.update({
        where: { id: carrinho.id },
        data: { atualizadoEm: new Date() },
      }),
    ]);
  },

  async removerItem(clienteId: number, produtoId: number): Promise<boolean> {
    const carrinho = await prisma.carrinho.findUnique({
      where: { clienteId },
      select: { id: true },
    });

    if (!carrinho) return false;

    const { count } = await prisma.itemCarrinho.deleteMany({
      where: { carrinhoId: carrinho.id, produtoId },
    });

    return count > 0;
  },

  async esvaziar(clienteId: number, tx: Prisma.TransactionClient | typeof prisma = prisma): Promise<void> {
    const carrinho = await tx.carrinho.findUnique({
      where: { clienteId },
      select: { id: true },
    });

    if (!carrinho) return;

    await tx.itemCarrinho.deleteMany({ where: { carrinhoId: carrinho.id } });
  },

  /** Quando o bloqueio deste carrinho expira — o front mostra a contagem. */
  bloqueadoAte(atualizadoEm: Date): Date {
    return new Date(atualizadoEm.getTime() + env.minutosBloqueioCarrinho * 60 * 1000);
  },
};
