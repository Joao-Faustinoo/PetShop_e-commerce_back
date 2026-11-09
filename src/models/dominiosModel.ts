/**
 * [MODEL] Model de tabelas de domínio
 *
 * O QUE FAZ: lê as treze tabelas de domínio, que são estáveis e só de
 * leitura.
 *
 * COMO FARÁ: usa o cliente do Prisma e devolve os dados já no formato dos
 * tipos do domínio. Não aplica regra de negócio: essa responsabilidade é
 * do service.
 *
 * As treze saem em uma ida só ao banco, em paralelo: são listas curtas que
 * a tela carrega inteiras para montar os selects, e treze consultas
 * sequenciais custariam treze viagens ao Supabase.
 *
 * ATENDE: RNF0013, RN0023, RN0025
 */

import { prisma } from '../config/prisma';
import {
  Dominios,
  PorteSigla,
} from '../types/dominios/types';
import { Executor } from '../utils/transacao';

const porNome = { orderBy: { nome: 'asc' } } as const;

export const dominiosModel = {
  async listarTodos(tx: Executor = prisma): Promise<Dominios> {
    const [
      gruposPrecificacao,
      marcas,
      categorias,
      portes,
      cores,
      materiais,
      fornecedores,
      bandeiras,
      tiposResidencia,
      tiposLogradouro,
      tiposTelefone,
      motivosInativacao,
      motivosAtivacao,
    ] = await Promise.all([
      tx.grupoPrecificacao.findMany(porNome),
      tx.marca.findMany(porNome),
      tx.categoria.findMany(porNome),
      tx.porte.findMany({ orderBy: { pesoMin: 'asc' } }),
      tx.cor.findMany(porNome),
      tx.material.findMany(porNome),
      tx.fornecedor.findMany(porNome),
      tx.bandeiraCartao.findMany(porNome),
      tx.tipoResidencia.findMany(porNome),
      tx.tipoLogradouro.findMany(porNome),
      tx.tipoTelefone.findMany(porNome),
      tx.motivoInativacao.findMany(porNome),
      tx.motivoAtivacao.findMany(porNome),
    ]);

    return {
      gruposPrecificacao: gruposPrecificacao.map(g => ({
        id: g.id,
        nome: g.nome,
        margemLucro: g.margemLucro.toNumber(),
      })),
      marcas,
      categorias,
      portes: portes.map(p => ({
        id: p.id,
        nome: p.nome,
        sigla: p.sigla as PorteSigla,
        pesoMinimo: p.pesoMin.toNumber(),
        pesoMaximo: p.pesoMax.toNumber(),
      })),
      cores,
      materiais,
      fornecedores: fornecedores.map(f => ({
        id: f.id,
        nome: f.nome,
        cnpj: f.cnpj,
      })),
      bandeiras,
      tiposResidencia,
      tiposLogradouro,
      tiposTelefone,
      motivosInativacao: motivosInativacao.map(m => ({ id: m.id, nome: m.nome })),
      motivosAtivacao,
    };
  },
};
