"""
Monta a matriz de rastreabilidade do projeto.

Para cada requisito do DRS, procura onde ele é citado no código dos dois
repositórios e em que caso de teste ele aparece. A citação vem dos
cabeçalhos `ATENDE:` e dos comentários de regra que o projeto já usa — a
matriz não inventa vínculo, ela coleta o que o código afirma.
"""

import io
import os
import re
import sys
import zipfile

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

DRS = r'D:\WorkPlace\LES\DRS_LES_2_2026_Petshop.docx'
REPOS = [
    ('api', r'D:\WorkPlace\LES\api\src'),
    ('front', r'D:\WorkPlace\LES\e-commerce\src'),
]
TESTES = r'D:\WorkPlace\LES\e-commerce\cypress\e2e'
SAIDA = os.path.join(os.path.dirname(__file__), '..', 'docs', 'RASTREABILIDADE.md')


def requisitos_do_drs() -> list[tuple[str, str]]:
    """Os códigos e títulos, na ordem em que o DRS os apresenta."""
    xml = zipfile.ZipFile(DRS).read('word/document.xml').decode('utf-8')
    linhas = [
        l.strip()
        for l in re.sub(r'<[^>]+>', '', re.sub(r'</w:p>', '\n', xml)).split('\n')
    ]
    padrao = re.compile(r'^(RF|RNF|RN)\d{4}$')
    achados = []

    for i, linha in enumerate(linhas):
        if padrao.match(linha) and linha not in [c for c, _ in achados]:
            titulo = next((s for s in linhas[i + 1:i + 4] if s), '')
            achados.append((linha, titulo))

    return achados


def arquivos(raiz: str):
    for pasta, _, nomes in os.walk(raiz):
        for nome in nomes:
            if nome.endswith(('.ts', '.tsx')):
                yield os.path.join(pasta, nome)


def mapear() -> dict[str, dict[str, list[str]]]:
    mapa: dict[str, dict[str, list[str]]] = {}

    for rotulo, raiz in REPOS:
        for caminho in arquivos(raiz):
            texto = io.open(caminho, encoding='utf-8', errors='replace').read()
            relativo = rotulo + '/' + os.path.relpath(caminho, raiz).replace('\\', '/')

            for codigo in set(re.findall(r'\b(?:RF|RNF|RN)\d{4}\b', texto)):
                mapa.setdefault(codigo, {'codigo': [], 'testes': []})
                mapa[codigo]['codigo'].append(relativo)

    for nome in os.listdir(TESTES):
        if not nome.endswith('.cy.ts'):
            continue

        texto = io.open(os.path.join(TESTES, nome), encoding='utf-8', errors='replace').read()

        for titulo in re.findall(r"it\('([^']+)'", texto):
            for codigo in set(re.findall(r'\b(?:RF|RNF|RN)\d{4}\b', titulo)):
                mapa.setdefault(codigo, {'codigo': [], 'testes': []})
                caso = titulo.split('·')[0].strip() if '·' in titulo else titulo[:28]
                if caso not in mapa[codigo]['testes']:
                    mapa[codigo]['testes'].append(caso)

    return mapa


def main() -> None:
    requisitos = requisitos_do_drs()
    mapa = mapear()

    linhas = [
        '# Matriz de rastreabilidade — Petshop e-commerce',
        '',
        'Para cada requisito do DRS, onde ele está implementado e qual caso de',
        'teste o exercita. A coluna "onde" é coletada dos cabeçalhos `ATENDE:` e',
        'dos comentários de regra do próprio código: a matriz não inventa',
        'vínculo, ela reúne o que o código declara.',
        '',
        'Gerada por `api/scripts/matriz.py`. Para refazer depois de mexer no',
        'código, rode `python scripts/matriz.py` dentro de `api`.',
        '',
        '| Requisito | Título | Onde | Testes |',
        '|---|---|---|---|',
    ]

    sem_codigo = []

    for codigo, titulo in requisitos:
        dados = mapa.get(codigo, {'codigo': [], 'testes': []})
        onde = sorted(set(dados['codigo']))
        testes = dados['testes']

        if not onde:
            sem_codigo.append(codigo)

        resumo = ', '.join(f'`{o}`' for o in onde[:3])
        if len(onde) > 3:
            resumo += f' _(+{len(onde) - 3})_'

        linhas.append(
            f'| **{codigo}** | {titulo[:54]} | {resumo or "—"} | '
            f'{", ".join(testes) or "—"} |'
        )

    cobertos = len(requisitos) - len(sem_codigo)
    linhas += [
        '',
        '## Resumo',
        '',
        f'- Requisitos no DRS: **{len(requisitos)}**',
        f'- Com implementação citada no código: **{cobertos}**',
        f'- Sem citação: **{len(sem_codigo)}**'
        + (f' — {", ".join(sem_codigo)}' if sem_codigo else ''),
        '',
    ]

    io.open(SAIDA, 'w', encoding='utf-8', newline='\n').write('\n'.join(linhas))
    print(f'  {len(requisitos)} requisitos; {cobertos} com código citado')
    if sem_codigo:
        print('  sem citação:', ', '.join(sem_codigo))
    print('  gravado em', SAIDA)


main()
