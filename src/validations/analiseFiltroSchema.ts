/**
 * [MODEL] Schema de validação — filtro da análise gerencial
 *
 * O QUE FAZ: valida o período e as categorias antes de chegarem ao
 * service.
 *
 * COMO FARÁ: objeto Zod exigindo data de início, data de fim e ao menos
 * uma categoria. O recorte de 1 a 24 meses da RN0072 fica no service, e
 * não aqui: ele compara as duas datas entre si, e a mensagem precisa dizer
 * quantos meses o período tem.
 *
 * As categorias chegam na query string, que não tem tipo: `1,2,3` ou
 * `categoriaIds=1&categoriaIds=2`. As duas formas viram lista de números.
 */

import { z } from 'zod';

const data = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato AAAA-MM-DD.');

export const analiseFiltroSchema = z.object({
  dataInicio: data,
  dataFim: data,
  categoriaIds: z
    .union([z.string(), z.array(z.string())])
    .transform(valor =>
      (Array.isArray(valor) ? valor : valor.split(','))
        .map(v => Number(v.trim()))
        .filter(v => Number.isInteger(v) && v > 0),
    )
    .refine(ids => ids.length > 0, 'Selecione ao menos uma categoria.'),
});
