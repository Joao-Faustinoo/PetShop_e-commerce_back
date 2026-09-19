/**
 * [MODEL] Model de autenticação
 *
 * O QUE FAZ: lê o usuário pelo e-mail e grava o hash da senha.
 *
 * COMO FARÁ: usa o cliente do Prisma e devolve os dados já no formato dos
 * tipos do domínio. Não aplica regra de negócio: essa responsabilidade é
 * do service.
 *
 * ATENDE: premissas do projeto (autenticação por perfil)
 *
 * ESTADO: não há hash de senha a gravar. As premissas do DRS dispensam a
 * autenticação real, então o model apenas identifica o cliente dono do
 * e-mail; quem decide se aquilo vira sessão é o service.
 */

import { prisma } from '../config/prisma';

/** O recorte do cliente de que a autenticação precisa — nada além disso. */
export interface ClienteAutenticavel {
  id: number;
  nome: string;
  email: string;
  /** RF0023: cadastro inativado não entra no sistema. */
  ativo: boolean;
}

const recorte = { id: true, nome: true, email: true, ativo: true } as const;

export const authModel = {
  /** O e-mail chega já normalizado pelo service. */
  async buscarClientePorEmail(email: string): Promise<ClienteAutenticavel | null> {
    return prisma.cliente.findUnique({ where: { email }, select: recorte });
  },

  /** Usado por GET /auth/eu, que reconfere a sessão contra o banco. */
  async buscarClientePorId(id: number): Promise<ClienteAutenticavel | null> {
    return prisma.cliente.findUnique({ where: { id }, select: recorte });
  },
};
