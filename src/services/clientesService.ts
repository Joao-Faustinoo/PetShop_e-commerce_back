/**
 * [MODEL] Service de clientes
 *
 * O QUE FAZ: valida o CPF e a unicidade do e-mail, aplica a situação
 * ativo/inativo e recalcula o ranking a partir do histórico de compras.
 *
 * COMO FARÁ: orquestra o model e aplica as regras do DRS, lançando
 * ApiError quando uma delas é violada. Não conhece `req` nem `res`. A
 * referência de implementação é
 * `../e-commerce/src/service/clientes/service.ts`, onde as mesmas regras
 * já estão escritas sobre dados mockados.
 *
 * ATENDE: RF0021-RF0025, RNF0035
 */

import { clientesModel, DadosEndereco } from '../models/clientesModel';
import { pedidosModel } from '../models/pedidosModel';
import {
  AlterarClientePayload,
  AlterarSituacaoPayload,
  Cliente,
  ClienteFiltros,
  CriarClientePayload,
} from '../types/clientes/types';
import { Pagina, Paginacao } from '../types/common/types';
import { Pedido } from '../types/pedidos/types';
import { ApiError } from '../utils/ApiError';
import { montarPagina } from '../utils/paginacao';
import { Executor } from '../utils/transacao';
import { apenasDigitos, cpfValido } from '../validations/clienteSchema';

/**
 * RN0027: o ranking sai do perfil de compras — quanto mais o cliente gastou
 * em compras efetivadas (RN0074), maior a nota, de 1 a 5.
 *
 * O DRS pede "um ranking numérico com base em seu perfil de compras" e não
 * diz mais nada: nem fórmula, nem escala, nem faixas. Estas são premissa do
 * projeto, calibradas pela base real — os clientes vão de pouco mais de mil
 * a quase treze mil reais em dois anos, e faixas apertadas demais colocariam
 * todo mundo em 5, que é um ranking que não distingue ninguém.
 */
export const calcularRanking = (totalGasto: number): number => {
  if (totalGasto >= 10000) return 5;
  if (totalGasto >= 7500) return 4;
  if (totalGasto >= 5000) return 3;
  if (totalGasto > 0) return 2;

  return 1;
};

/**
 * Garante que o cliente existe antes de qualquer operação sobre ele, para
 * que o erro devolvido seja 404 e não a exceção crua do Prisma.
 */
const exigirCliente = async (id: number): Promise<Cliente> => {
  const cliente = await clientesModel.buscarPorId(id);

  if (!cliente) throw ApiError.naoEncontrado('Cliente não encontrado.');

  return cliente;
};

/**
 * CPF e e-mail identificam o cliente e não podem repetir. `idAtual` isenta
 * o próprio registro na alteração — senão o cliente colidiria consigo mesmo.
 */
const exigirIdentificadoresLivres = async (
  cpf: string,
  email: string,
  idAtual?: number,
): Promise<void> => {
  const donoDoCpf = await clientesModel.buscarIdPorCpf(cpf);

  if (donoDoCpf !== null && donoDoCpf !== idAtual) {
    throw ApiError.conflito('Já existe um cliente cadastrado com este CPF.');
  }

  const donoDoEmail = await clientesModel.buscarIdPorEmail(email);

  if (donoDoEmail !== null && donoDoEmail !== idAtual) {
    throw ApiError.conflito('Já existe um cliente cadastrado com este e-mail.');
  }
};

/**
 * O schema Zod já barra CPF inválido na borda HTTP; a checagem se repete
 * aqui porque o service também é chamado de outros pontos (seed, futuros
 * jobs) e a regra não pode depender de quem chamou.
 */
const normalizarCpf = (cpf: string): string => {
  if (!cpfValido(cpf)) throw ApiError.requisicaoInvalida('CPF inválido.');

  return apenasDigitos(cpf);
};

const normalizarEmail = (email: string): string => email.trim().toLowerCase();

export const clientesService = {
  /** RF0024: consulta por qualquer campo identificador, isolado ou combinado. */
  async listar(
    filtros: ClienteFiltros,
    paginacao: Paginacao,
  ): Promise<Pagina<Cliente>> {
    const { itens, total } = await clientesModel.listar(filtros, paginacao);

    // A lista devolve o registro-base; as coleções só no detalhe. Para o
    // front continuar recebendo a mesma forma, os campos vêm vazios.
    const completos = itens.map(base => ({
      ...base,
      enderecos: [],
      cartoes: [],
      pets: [],
    }));

    return montarPagina(completos, total, paginacao);
  },

  /** RF0022: detalhe com endereços, cartões e pets. */
  async buscarPorId(id: number): Promise<Cliente> {
    return exigirCliente(id);
  },

  /** RF0021 e RN0021/RN0022/RN0026/RNF0035. */
  async criar(payload: CriarClientePayload): Promise<Cliente> {
    const cpf = normalizarCpf(payload.cpf);
    const email = normalizarEmail(payload.email);

    await exigirIdentificadoresLivres(cpf, email);

    const cobranca: DadosEndereco = {
      ...payload.enderecoCobranca,
      tipo: 'COBRANCA',
    };
    const entrega: DadosEndereco = {
      ...payload.enderecoEntrega,
      tipo: 'ENTREGA',
    };

    // RN0027: sem histórico de compras, o cliente entra no menor ranking —
    // o valor padrão da coluna já é 1.
    return clientesModel.criar(
      {
        nome: payload.nome,
        genero: payload.genero,
        dataNascimento: payload.dataNascimento,
        cpf,
        email,
        telefone: payload.telefone,
      },
      cobranca,
      entrega,
    );
  },

  /** RF0022: alteração dos dados cadastrais. */
  async alterar(id: number, payload: AlterarClientePayload): Promise<Cliente> {
    await exigirCliente(id);

    const cpf = normalizarCpf(payload.cpf);
    const email = normalizarEmail(payload.email);

    await exigirIdentificadoresLivres(cpf, email, id);

    return clientesModel.atualizar(id, {
      nome: payload.nome,
      genero: payload.genero,
      dataNascimento: payload.dataNascimento,
      cpf,
      email,
      telefone: payload.telefone,
    });
  },

  /** RF0023: inativação e reativação, sempre com justificativa registrada. */
  async alterarSituacao(
    id: number,
    payload: AlterarSituacaoPayload,
  ): Promise<Cliente> {
    const cliente = await exigirCliente(id);

    if (cliente.ativo === payload.ativo) {
      throw ApiError.requisicaoInvalida(
        payload.ativo
          ? 'Este cliente já está ativo.'
          : 'Este cliente já está inativo.',
      );
    }

    return clientesModel.alterarSituacao(id, payload.ativo, payload.justificativa);
  },

  /**
   * RF0025: todas as transações já realizadas pelo cliente.
   *
   * O DRS não define o que é uma "transação". Adotamos a compra: é o que o
   * sistema registra, é o que a tela do administrador exibe no cadastro, e
   * é do que o ranking da RN0027 depende.
   */
  async listarTransacoes(id: number): Promise<Pedido[]> {
    await exigirCliente(id);

    // O teto de 100 da paginação basta: é o histórico de um cliente só,
    // exibido inteiro numa tabela dentro do cadastro dele.
    const { itens } = await pedidosModel.listar(
      { clienteId: id },
      { pagina: 1, itensPorPagina: 100 },
    );

    return itens;
  },

  /**
   * RN0027: reavalia o ranking depois de uma compra ser efetivada.
   *
   * O DRS pede "um ranking numérico com base no perfil de compras" e não
   * diz mais nada: nem fórmula, nem escala, nem quando recalcular. A
   * premissa adotada é a soma gasta nas compras efetivadas, nas faixas de
   * `calcularRanking`, reavaliada no momento em que a compra é aprovada.
   *
   * Roda dentro da transação do checkout: o ranking e a compra que o
   * mudou precisam valer ou falhar juntos.
   */
  async atualizarRanking(id: number, tx: Executor): Promise<Cliente> {
    const totalGasto = await pedidosModel.totalGastoPeloCliente(id, tx);

    return clientesModel.atualizarRanking(id, calcularRanking(totalGasto), tx);
  },
};
