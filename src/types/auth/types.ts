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
 * ESTADO: portado por inteiro. `Usuario`, `LoginPayload` e `LoginResponse`
 * espelham o arquivo homônimo do front, para que o service de lá troque o
 * mock pela chamada HTTP sem mexer em tipo nenhum.
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

/** Usuário como o front o guarda na sessão. */
export interface Usuario {
  id: number;
  nome: string;
  email: string;
  perfil: Perfil;
  /** Preenchido apenas quando o perfil é CLIENTE. */
  clienteId?: number;
}

export interface LoginPayload {
  email: string;
  senha: string;
}

export interface LoginResponse {
  /**
   * JWT assinado por esta API. O front guarda no localStorage e o envia em
   * `Authorization: Bearer`; é o mesmo token que `autenticacao` verifica.
   */
  token: string;
  usuario: Usuario;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: UsuarioAutenticado;
    }
  }
}
