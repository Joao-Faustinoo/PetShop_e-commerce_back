/**
 * [CONTROLLER] Rotas do assistente de recomendação
 *
 * O QUE FAZ: associa o caminho do assistente ao handler do controller.
 *
 * COMO FARÁ: define o Router do Express, com autenticação e validação
 * antes do handler. A recomendação é personalizada pelos pets e pelo
 * histórico de quem pergunta, então exige sessão de cliente.
 *
 * ATENDE: RNF0047
 */

/*
 * Endpoints:
 *   POST /assistente/mensagens   cliente
 */

import { Router } from 'express';
import { z } from 'zod';

import { chatController } from '../controllers/chatController';
import { autenticacao } from '../middlewares/autenticacao';
import { validar } from '../middlewares/validar';

/** O limite de tamanho evita mandar um texto enorme para o modelo. */
const mensagemSchema = z.object({
  texto: z
    .string()
    .trim()
    .min(2, 'Escreva sua pergunta.')
    .max(500, 'A pergunta é longa demais; resuma em até 500 caracteres.'),
});

export const chatRoutes = Router();

chatRoutes.post(
  '/mensagens',
  autenticacao,
  validar({ body: mensagemSchema }),
  chatController.responder,
);
