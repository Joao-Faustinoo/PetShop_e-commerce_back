/**
 * [MODEL] Tipos de auth
 *
 * O QUE FAZ: define o contrato de dados de auth.
 *
 * COMO FARÁ: declara as interfaces de entidade, os payloads de criação e
 * alteração e os filtros de consulta. Só interfaces, sem lógica. Pode ser
 * portado de `../e-commerce/src/types/auth/types.ts`, onde já está
 * definido.
 *
 * ATENDE: RF0001-RF0005, RN0001-RN0003
 *
 * ESTADO: só a parte consumida pelos middlewares de autenticação e
 * autorização está portada — o suficiente para as rotas de outros domínios
 * se protegerem. O restante do domínio (login, troca de senha) continua
 * pendente junto com o seu service.
 */

export type Perfil = 'ADMIN' | 'CLIENTE';

/** Conteúdo que a API assina no JWT e relê a cada requisição. */
export interface TokenPayload {
  sub: number;
  perfil: Perfil;
  /** Presente quando o usuário é um CLIENTE; é o id do seu cadastro. */
  clienteId?: number;
}

/** Usuário já identificado, anexado à requisição pelo middleware. */
export interface UsuarioAutenticado {
  id: number;
  perfil: Perfil;
  clienteId?: number;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: UsuarioAutenticado;
    }
  }
}
