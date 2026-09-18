/**
 * [CONTROLLER] Montagem da aplicação Express
 *
 * O QUE FAZ: reúne middlewares globais e o roteador da API.
 *
 * COMO FARÁ: aplica CORS liberado para a origem do front, o parser de
 * JSON, registra as rotas sob `/api` e, por último, o middleware de
 * tratamento de erro — que precisa ser o último para capturar o que vier
 * das camadas anteriores.
 */

import cors from 'cors';
import express, { Express } from 'express';

import { env } from './config/env';
import { rotaNaoEncontrada, tratarErro } from './middlewares/tratarErro';
import { rotas } from './routes';

export const criarApp = (): Express => {
  const app = express();

  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json());

  app.use('/api', rotas);

  // A ordem daqui para baixo importa: o 404 responde o que nenhuma rota
  // atendeu, e o tratador de erro fecha a cadeia.
  app.use(rotaNaoEncontrada);
  app.use(tratarErro);

  return app;
};
