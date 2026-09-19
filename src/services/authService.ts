/**
 * [MODEL] Service de autenticação
 *
 * O QUE FAZ: confere as credenciais, gera o token JWT e devolve o usuário
 * com o perfil.
 *
 * COMO FARÁ: orquestra o model e aplica as regras do DRS, lançando
 * ApiError quando uma delas é violada. Não conhece `req` nem `res`. A
 * referência de implementação é
 * `../e-commerce/src/service/auth/service.ts`, onde as mesmas regras já
 * estão escritas sobre dados mockados.
 *
 * ATENDE: premissas do projeto (autenticação por perfil)
 */

import jwt from 'jsonwebtoken';

import { env } from '../config/env';
import { authModel, ClienteAutenticavel } from '../models/authModel';
import {
  LoginPayload,
  LoginResponse,
  Perfil,
  TokenPayload,
  Usuario,
  UsuarioAutenticado,
} from '../types/auth/types';
import { CriarClientePayload } from '../types/clientes/types';
import { ApiError } from '../utils/ApiError';
import { clientesService } from './clientesService';

/**
 * PREMISSA DO DRS: a senha não é verificada. O documento define o login
 * como mockado, com dois usuários pré-cadastrados, e por isso o model
 * `Cliente` não guarda senha nenhuma — não há hash a comparar.
 *
 * O que esta API faz de diferente do mock do front é emitir um JWT
 * assinado de verdade, em vez de uma string inventada. Sem isso o
 * middleware `autenticacao` recusaria toda requisição protegida, e nenhum
 * service do front conseguiria sair do mock. A premissa continua atendida:
 * quem sabe o e-mail entra, qualquer senha serve.
 *
 * Para exigir senha de verdade mais tarde: acrescentar a coluna ao model
 * `Cliente`, gerar a migration e comparar o hash aqui dentro, com o
 * `bcryptjs` que já está nas dependências. Nada fora deste arquivo muda.
 */

/**
 * O administrador não tem cadastro de cliente — ele não compra, administra.
 * Como não existe tabela de usuários, ele vive aqui, espelhando
 * `e-commerce/src/mock/auth/mock.ts` para que o mesmo e-mail que a tela de
 * login oferece como atalho continue funcionando.
 */
const ADMIN_PRE_CADASTRADO: Usuario = {
  id: 2,
  nome: 'João Faustino',
  email: 'user.admin@email.com',
  perfil: 'ADMIN',
};

const normalizarEmail = (email: string): string => email.trim().toLowerCase();

/** O cliente vira usuário de sessão; o id do cadastro é também o do usuário. */
const paraUsuario = (cliente: ClienteAutenticavel): Usuario => ({
  id: cliente.id,
  nome: cliente.nome,
  email: cliente.email,
  perfil: 'CLIENTE' satisfies Perfil,
  clienteId: cliente.id,
});

/**
 * Assina o mesmo payload que `autenticacao` relê. `expiresIn` sai do
 * ambiente; o cast existe porque a tipagem do jsonwebtoken só aceita o
 * literal de duração, e o nosso valor é lido como string comum.
 */
const gerarToken = (usuario: Usuario): string => {
  const payload: TokenPayload = {
    sub: usuario.id,
    perfil: usuario.perfil,
    ...(usuario.clienteId !== undefined && { clienteId: usuario.clienteId }),
  };

  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
};

/**
 * RF0023: um cadastro inativado não entra. A mensagem é específica de
 * propósito — "e-mail ou senha inválidos" faria o cliente tentar de novo
 * sem entender por que nunca funciona.
 */
const exigirAtivo = (cliente: ClienteAutenticavel): void => {
  if (!cliente.ativo) {
    throw ApiError.naoAutorizado(
      'Este cadastro está inativo. Procure o administrador.',
    );
  }
};

export const authService = {
  /** POST /auth/login */
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const email = normalizarEmail(payload.email);

    if (email === ADMIN_PRE_CADASTRADO.email) {
      return { token: gerarToken(ADMIN_PRE_CADASTRADO), usuario: ADMIN_PRE_CADASTRADO };
    }

    const cliente = await authModel.buscarClientePorEmail(email);

    // A mesma resposta para e-mail inexistente e senha errada, para não
    // revelar quais e-mails estão cadastrados.
    if (!cliente) {
      throw ApiError.naoAutenticado('E-mail ou senha inválidos');
    }

    exigirAtivo(cliente);

    const usuario = paraUsuario(cliente);

    return { token: gerarToken(usuario), usuario };
  },

  /**
   * POST /auth/registrar — RF0021.
   *
   * O autocadastro em si é o do domínio de clientes; aqui ele ganha a
   * sessão de brinde, para o visitante já entrar logado depois de se
   * cadastrar, sem uma segunda viagem até o login.
   */
  async registrar(payload: CriarClientePayload): Promise<LoginResponse> {
    const cliente = await clientesService.criar(payload);

    const usuario: Usuario = {
      id: cliente.id,
      nome: cliente.nome,
      email: cliente.email,
      perfil: 'CLIENTE',
      clienteId: cliente.id,
    };

    return { token: gerarToken(usuario), usuario };
  },

  /**
   * GET /auth/eu — devolve quem é o dono do token.
   *
   * Relê do banco em vez de devolver o payload do JWT: o token vale um dia
   * inteiro e, nesse intervalo, o cadastro pode ter sido renomeado ou
   * inativado por um ADMIN.
   */
  async eu(autenticado: UsuarioAutenticado): Promise<Usuario> {
    if (autenticado.perfil === 'ADMIN') return ADMIN_PRE_CADASTRADO;

    const clienteId = autenticado.clienteId ?? autenticado.id;
    const cliente = await authModel.buscarClientePorId(clienteId);

    if (!cliente) {
      throw ApiError.naoAutenticado('A sessão aponta para um cadastro que não existe mais.');
    }

    exigirAtivo(cliente);

    return paraUsuario(cliente);
  },
};
