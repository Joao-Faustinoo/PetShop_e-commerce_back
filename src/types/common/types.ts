/**
 * [MODEL] Tipos comuns
 *
 * O QUE FAZ: reúne os tipos transversais a todos os domínios.
 *
 * COMO FARÁ: define paginação, página de resultado, erro da API e o par
 * value/label dos selects. Espelha
 * `../e-commerce/src/types/common/types.ts`, para que front e back falem o
 * mesmo vocabulário.
 */

export interface Paginacao {
  pagina: number;
  itensPorPagina: number;
}

export interface Pagina<T> {
  itens: T[];
  total: number;
  pagina: number;
  itensPorPagina: number;
}

/**
 * Corpo de erro devolvido pela API. O front tipa o mesmo formato como
 * `ApiError`; aqui o nome muda para não colidir com a classe de erro de
 * `utils/ApiError`, que é o que os services lançam.
 */
export interface RespostaErro {
  error: {
    message: string;
    /** Preenchido só quando o erro veio da validação de schema. */
    detalhes?: string[];
  };
}

export interface Opcao {
  value: number | string;
  label: string;
}

/** Datas no formato ISO (AAAA-MM-DD), como vêm dos inputs type="date". */
export interface Periodo {
  dataInicio: string;
  dataFim: string;
}
