/**
 * [CONTROLLER] Roteador principal
 *
 * O QUE FAZ: reúne os roteadores de todos os domínios sob um único ponto.
 *
 * COMO FARÁ: importa cada arquivo de rotas e os monta no Router principal,
 * que o `app.ts` registra sob o prefixo `/api`. Também expõe `/health`,
 * para verificação de disponibilidade.
 *
 * ESTADO: auth e clientes montados. Cada fatia implementada acrescenta uma
 * linha aqui — os arquivos de rota dos outros domínios seguem em TODO e
 * por isso não são importados ainda.
 */

import { Router } from 'express';

import { authRoutes } from './authRoutes';
import { clientesRoutes } from './clientesRoutes';

export const rotas = Router();

rotas.get('/health', (_req, res) => {
  res.json({ status: 'ok', em: new Date().toISOString() });
});

rotas.use('/auth', authRoutes);
rotas.use('/clientes', clientesRoutes);
