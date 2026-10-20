/**
 * [CONTROLLER] Roteador principal
 *
 * O QUE FAZ: reúne os roteadores de todos os domínios sob um único ponto.
 *
 * COMO FARÁ: importa cada arquivo de rotas e os monta no Router principal,
 * que o `app.ts` registra sob o prefixo `/api`. Também expõe `/health`,
 * para verificação de disponibilidade.
 *
 * ESTADO: auth, clientes, produtos, carrinho, pedidos, endereços e
 * cartões montados. Cada fatia implementada acrescenta uma
 * linha aqui — os arquivos de rota dos outros domínios seguem em TODO e
 * por isso não são importados ainda.
 */

import { Router } from 'express';

import { authRoutes } from './authRoutes';
import { clientesRoutes } from './clientesRoutes';
import { carrinhoRoutes } from './carrinhoRoutes';
import { cartoesRoutes } from './cartoesRoutes';
import { cuponsRoutes } from './cuponsRoutes';
import { enderecosRoutes } from './enderecosRoutes';
import { notificacoesRoutes } from './notificacoesRoutes';
import { pedidosRoutes } from './pedidosRoutes';
import { produtosRoutes } from './produtosRoutes';
import { trocasRoutes } from './trocasRoutes';

export const rotas = Router();

rotas.get('/health', (_req, res) => {
  res.json({ status: 'ok', em: new Date().toISOString() });
});

rotas.use('/auth', authRoutes);
rotas.use('/clientes', clientesRoutes);
rotas.use('/produtos', produtosRoutes);
rotas.use('/carrinho', carrinhoRoutes);
rotas.use('/pedidos', pedidosRoutes);
rotas.use('/enderecos', enderecosRoutes);
rotas.use('/cartoes', cartoesRoutes);
rotas.use('/trocas', trocasRoutes);
rotas.use('/notificacoes', notificacoesRoutes);
rotas.use('/cupons', cuponsRoutes);
