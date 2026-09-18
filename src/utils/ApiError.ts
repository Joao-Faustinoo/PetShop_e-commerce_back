/**
 * [MODEL] Erro de negócio
 *
 * O QUE FAZ: representa um erro previsto, com o status HTTP
 * correspondente.
 *
 * COMO FARÁ: estende Error acrescentando o código de status. Os services
 * lançam esta classe quando uma regra é violada; o middleware de erro a
 * converte em resposta. Assim o service não precisa conhecer HTTP.
 */

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, mensagem: string) {
    super(mensagem);
    this.name = 'ApiError';
    this.status = status;

    // Mantém a cadeia de protótipo correta ao estender Error compilando
    // para ES2022 — sem isto, `instanceof` falha em alguns alvos.
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  /** Dado enviado pelo cliente não satisfaz uma regra. */
  static requisicaoInvalida(mensagem: string): ApiError {
    return new ApiError(400, mensagem);
  }

  /** Falta autenticação ou o token não é válido. */
  static naoAutenticado(mensagem = 'Autenticação necessária.'): ApiError {
    return new ApiError(401, mensagem);
  }

  /** Autenticado, mas o perfil não alcança o recurso. */
  static naoAutorizado(
    mensagem = 'Você não tem permissão para esta operação.',
  ): ApiError {
    return new ApiError(403, mensagem);
  }

  static naoEncontrado(mensagem: string): ApiError {
    return new ApiError(404, mensagem);
  }

  /** Choca com um registro existente — CPF ou e-mail já cadastrado. */
  static conflito(mensagem: string): ApiError {
    return new ApiError(409, mensagem);
  }
}
