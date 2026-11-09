/**
 * [MODEL] Service de tabelas de domínio
 *
 * O QUE FAZ: entrega as listas que alimentam os selects do sistema, sem
 * regra de negócio associada.
 *
 * COMO FARÁ: lê o model e, quando a tela pede uma lista só, recorta a que
 * foi nomeada. O nome é conferido contra uma lista fechada: aceitar
 * qualquer texto abriria a porta para a URL escolher o que é lido do banco.
 *
 * ATENDE: RNF0013, RN0023, RN0025
 */

import { dominiosModel } from '../models/dominiosModel';
import { Dominios, NomeDominio } from '../types/dominios/types';
import { ApiError } from '../utils/ApiError';

/** De cada nome que a tela usa para a chave correspondente na resposta. */
const CHAVE_DO_NOME: Record<NomeDominio, keyof Dominios> = {
  grupoPrecificacao: 'gruposPrecificacao',
  marca: 'marcas',
  categoria: 'categorias',
  porte: 'portes',
  cor: 'cores',
  material: 'materiais',
  fornecedor: 'fornecedores',
  bandeiraCartao: 'bandeiras',
  tipoResidencia: 'tiposResidencia',
  tipoLogradouro: 'tiposLogradouro',
  tipoTelefone: 'tiposTelefone',
  motivoInativacao: 'motivosInativacao',
  motivoAtivacao: 'motivosAtivacao',
};

export const NOMES_DE_DOMINIO = Object.keys(CHAVE_DO_NOME) as NomeDominio[];

export const dominiosService = {
  /** RNF0013: todas as tabelas de domínio de uma vez. */
  async listarTodos(): Promise<Dominios> {
    return dominiosModel.listarTodos();
  },

  /** Uma tabela só, para a tela que precisa de um select apenas. */
  async listarUm(nome: string): Promise<Dominios[keyof Dominios]> {
    const chave = CHAVE_DO_NOME[nome as NomeDominio];

    if (!chave) {
      throw ApiError.naoEncontrado(`Tabela de domínio "${nome}" não existe.`);
    }

    return (await dominiosModel.listarTodos())[chave];
  },
};
