/**
 * [MODEL] Histórico de vendas para a análise gerencial
 *
 * O QUE FAZ: gera compras espalhadas pelos últimos 24 meses, para o
 * gráfico da RF0055 ter o que comparar.
 *
 * COMO FARÁ: sorteia cliente, produtos e datas com um gerador
 * pseudoaleatório de semente fixa, então a mesma carga produz sempre as
 * mesmas compras — o gráfico não muda de forma entre uma execução e outra,
 * e a demonstração é reproduzível.
 *
 * POR QUE existe: a RN0072 permite analisar até 24 meses e a RN0073 trata
 * os meses sem venda, mas o banco só tem as compras feitas em
 * desenvolvimento, todas do mês corrente. Sem histórico o gráfico mostra
 * uma coluna só, e nem a comparação entre categorias nem o preenchimento
 * dos meses vazios podem ser demonstrados.
 *
 * O que ele NÃO faz, de propósito:
 *
 * - **não mexe em estoque.** Estas compras são registro histórico, e dar
 *   baixa nelas zeraria o saldo que o catálogo precisa ter para a RN0031
 *   funcionar hoje.
 * - **não grava pagamento.** O gráfico soma `ItemPedido` por categoria e
 *   filtra por `situacao`; a forma de pagamento não entra na conta. Gravar
 *   pagamento exigiria cartões para sete clientes que não os têm, só para
 *   sustentar um dado que ninguém lê. As compras do histórico são, por
 *   isso, registros de venda sem o detalhe do pagamento.
 * - **não usa o cliente 1.** É o cliente das demonstrações e dos testes;
 *   enchê-lo de compras antigas atrapalharia a tela "meus pedidos".
 *
 * ATENDE: RF0055, RF0057, RN0071, RN0072, RN0073, RN0074
 */

import { SituacaoPedido } from '@prisma/client';

/** A faixa de ids reservada ao histórico, que o seed recria a cada carga. */
export const PRIMEIRO_ID_HISTORICO = 10000;

/** Quantos meses para trás o histórico cobre (RN0072: o máximo). */
const MESES = 24;

/** Compras por mês. Varia um pouco, para a linha não ficar reta. */
const MINIMO_POR_MES = 4;
const MAXIMO_POR_MES = 11;

/** Os clientes do seed que compram no histórico — o 1 fica de fora. */
const CLIENTES = [2, 3, 4, 5, 6, 7, 8];

/**
 * RN0074: só entram no gráfico as compras APROVADA, EM TRANSPORTE e
 * ENTREGUE. Gerar algumas REPROVADA prova que elas ficam de fora.
 */
const SITUACOES: SituacaoPedido[] = [
  SituacaoPedido.ENTREGUE,
  SituacaoPedido.ENTREGUE,
  SituacaoPedido.ENTREGUE,
  SituacaoPedido.APROVADA,
  SituacaoPedido.EM_TRANSPORTE,
  SituacaoPedido.REPROVADA,
];

export interface ProdutoPrecificado {
  id: number;
  nome: string;
  sku: string;
  valorVenda: number;
}

export interface ItemHistorico {
  produtoId: number;
  produtoNome: string;
  produtoSku: string;
  quantidade: number;
  valorUnitario: number;
  subtotal: number;
}

export interface PedidoHistorico {
  id: number;
  numero: string;
  clienteId: number;
  frete: number;
  subtotal: number;
  total: number;
  situacao: SituacaoPedido;
  dataCompra: Date;
  itens: ItemHistorico[];
}

/** mulberry32: pequeno, determinístico e suficiente para semear dados. */
const geradorDe = (semente: number) => {
  let estado = semente;

  return (): number => {
    estado |= 0;
    estado = (estado + 0x6d2b79f5) | 0;
    let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const duasCasas = (valor: number): number => Number(valor.toFixed(2));

/**
 * Monta o histórico. Recebe os produtos já precificados porque o preço
 * nasce da RN0013, aplicada no seed — aqui não se decide valor de venda.
 */
export const gerarHistorico = (
  produtos: ProdutoPrecificado[],
): PedidoHistorico[] => {
  const sortear = geradorDe(20262026);
  const entre = (min: number, max: number): number =>
    min + Math.floor(sortear() * (max - min + 1));

  const pedidos: PedidoHistorico[] = [];
  const hoje = new Date();
  let id = PRIMEIRO_ID_HISTORICO;

  // Do mês mais antigo para o mais recente; o mês corrente fica de fora,
  // porque é onde vivem as compras de desenvolvimento e de teste.
  for (let atras = MESES; atras >= 1; atras -= 1) {
    const mes = new Date(
      Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - atras, 1),
    );
    const diasNoMes = new Date(
      Date.UTC(mes.getUTCFullYear(), mes.getUTCMonth() + 1, 0),
    ).getUTCDate();

    for (let n = entre(MINIMO_POR_MES, MAXIMO_POR_MES); n > 0; n -= 1) {
      const itens: ItemHistorico[] = [];
      const quantosProdutos = entre(1, 3);

      for (let p = 0; p < quantosProdutos; p += 1) {
        const produto = produtos[entre(0, produtos.length - 1)];

        if (itens.some(i => i.produtoId === produto.id)) continue;

        const quantidade = entre(1, 3);
        itens.push({
          produtoId: produto.id,
          produtoNome: produto.nome,
          produtoSku: produto.sku,
          quantidade,
          valorUnitario: produto.valorVenda,
          subtotal: duasCasas(produto.valorVenda * quantidade),
        });
      }

      const subtotal = duasCasas(itens.reduce((s, i) => s + i.subtotal, 0));
      const frete = duasCasas(12.9 + sortear() * 20);

      pedidos.push({
        id,
        numero: `PED-${String(id).padStart(5, '0')}`,
        clienteId: CLIENTES[entre(0, CLIENTES.length - 1)],
        frete,
        subtotal,
        total: duasCasas(subtotal + frete),
        situacao: SITUACOES[entre(0, SITUACOES.length - 1)],
        dataCompra: new Date(
          Date.UTC(
            mes.getUTCFullYear(),
            mes.getUTCMonth(),
            entre(1, diasNoMes),
            entre(9, 20),
          ),
        ),
        itens,
      });

      id += 1;
    }
  }

  return pedidos;
};
