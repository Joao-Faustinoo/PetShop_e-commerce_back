/**
 * [CONTROLLER] Ponto de entrada da aplicação
 *
 * O QUE FAZ: sobe o servidor HTTP e o mantém escutando.
 *
 * COMO FARÁ: carrega as variáveis de ambiente, monta a aplicação Express
 * definida em `app.ts` e escuta na porta configurada. Mantém-se separado
 * do `app` para que os testes possam montar a aplicação sem abrir uma
 * porta.
 */

import { criarApp } from './app';
import { env } from './config/env';

const app = criarApp();

app.listen(env.porta, () => {
  console.log(`API ouvindo em http://localhost:${env.porta}/api`);
  console.log(`CORS liberado para ${env.corsOrigin}`);
});
