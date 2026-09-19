/**
 * [MODEL] Limpeza dos cadastros criados pelos testes
 *
 * O QUE FAZ: remove do banco os clientes que a suíte de ponta a ponta
 * cria, devolvendo a base ao conteúdo do seed.
 *
 * COMO FARÁ: apaga os clientes cujo e-mail segue o padrão dos testes
 * (`ct01.`, `ct02.`, `teste.`, `novo.`). Telefone, endereços, cartões e
 * pets saem junto, pelo `onDelete: Cascade` do schema.
 *
 * POR QUE existe: a API não tem DELETE de cliente, e não deve ter — a
 * RF0023 manda inativar, nunca excluir. Este script é ferramenta de
 * desenvolvimento, roda fora da aplicação e não é uma rota; nenhum
 * cadastro real passa por aqui.
 *
 * USO: `npm run limpar:testes`
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Os prefixos que os specs usam ao montar e-mails únicos. */
const PREFIXOS_DE_TESTE = ['ct01.', 'ct02.', 'ct02b.', 'teste.', 'novo.'];

const main = async (): Promise<void> => {
  const alvos = await prisma.cliente.findMany({
    where: {
      OR: PREFIXOS_DE_TESTE.map(prefixo => ({
        email: { startsWith: prefixo },
      })),
    },
    select: { id: true, codigo: true, nome: true, email: true },
  });

  if (alvos.length === 0) {
    console.log('Nada a limpar: a base só tem os cadastros do seed.');

    return;
  }

  alvos.forEach(c => console.log(`  removendo ${c.codigo} — ${c.email}`));

  const { count } = await prisma.cliente.deleteMany({
    where: { id: { in: alvos.map(c => c.id) } },
  });

  console.log(`${count} cadastro(s) de teste removido(s).`);
};

main()
  .catch(erro => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
