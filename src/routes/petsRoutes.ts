/**
 * [CONTROLLER] Rotas de pets
 *
 * O QUE FAZ: associa os caminhos de pets aos handlers do controller.
 *
 * COMO FARÁ: define o Router do Express, encadeando autenticação e
 * validação antes de cada handler. Quem é dono do pet é conferido no
 * controller, porque depende do `:clienteId` ou do `:id` da URL.
 *
 * O cadastro e a listagem pendem de `/clientes/:clienteId/pets`, porque o
 * pet não existe solto: a RN0029 o amarra obrigatoriamente a um cliente.
 *
 * ATENDE: RF0028, RF0029, RN0029
 */

/*
 * Endpoints:
 *   GET    /clientes/:clienteId/pets
 *   POST   /clientes/:clienteId/pets
 *   PUT    /pets/:id
 *   DELETE /pets/:id
 */

import { Router } from 'express';

import { petsController } from '../controllers/petsController';
import { autenticacao } from '../middlewares/autenticacao';
import { validar } from '../middlewares/validar';
import {
  clienteDoPetSchema,
  idPetSchema,
  petSchema,
} from '../validations/petSchema';

/** Os pets de um cliente, pendurados na rota de clientes. */
export const petsDoClienteRoutes = Router({ mergeParams: true });

petsDoClienteRoutes.use(autenticacao);

petsDoClienteRoutes.get(
  '/',
  validar({ params: clienteDoPetSchema }),
  petsController.listar,
);

petsDoClienteRoutes.post(
  '/',
  validar({ params: clienteDoPetSchema, body: petSchema }),
  petsController.criar,
);

/** O pet já cadastrado é alcançado pelo próprio id. */
export const petsRoutes = Router();

petsRoutes.use(autenticacao);

petsRoutes.put(
  '/:id',
  validar({ params: idPetSchema, body: petSchema }),
  petsController.alterar,
);

petsRoutes.delete(
  '/:id',
  validar({ params: idPetSchema }),
  petsController.remover,
);
