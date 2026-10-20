/**
 * [MODEL] Dados do catálogo para a carga inicial
 *
 * O QUE FAZ: reúne as tabelas de domínio do produto, os 20 itens do
 * catálogo e os cupons de troca e promocionais que a carga inicial grava.
 *
 * COMO FARÁ: transporta o conteúdo de `../e-commerce/src/mock/dominios`,
 * `/produtos` e `/cupons`, de modo que o banco nasça com o mesmo catálogo
 * que o front já exibe sobre dados mockados — os mesmos SKUs, os mesmos
 * preços e os mesmos cupons do exemplo da RN0036. Só dados: quem grava é
 * o `seed.ts`.
 *
 * ATENDE: RF0011-RF0016, RF0037, RF0045, RN0012, RN0013, RN0036, RN0050,
 * RNF0013, RNF0021
 */

import { Especie, PorteSigla, TipoCupom } from '@prisma/client';

// ---------------------------------------------------------------------------
// Tabelas de domínio do produto (RNF0013)
// ---------------------------------------------------------------------------

interface Dominio {
  id: number;
  nome: string;
}

/** RN0013: a margem de cada grupo define o valor de venda do produto. */
export const gruposPrecificacao: { id: number; nome: string; margemLucro: number }[] = [
  { id: 1, nome: 'Básico', margemLucro: 40 },
  { id: 2, nome: 'Premium', margemLucro: 80 },
  { id: 3, nome: 'Promocional', margemLucro: 20 },
  { id: 4, nome: 'Luxo', margemLucro: 120 },
];

export const marcas: Dominio[] = [
  { id: 1, nome: 'PetChic' },
  { id: 2, nome: 'AuMiau' },
  { id: 3, nome: 'DogStyle' },
  { id: 4, nome: 'CatComfort' },
  { id: 5, nome: 'Pata Nobre' },
  { id: 6, nome: 'Bicho Feliz' },
];

/** RN0012: um produto pode estar em mais de uma destas categorias. */
export const categorias: Dominio[] = [
  { id: 1, nome: 'Roupa' },
  { id: 2, nome: 'Acessório' },
  { id: 3, nome: 'Coleira' },
  { id: 4, nome: 'Brinquedo' },
  { id: 5, nome: 'Cama' },
];

export const cores: Dominio[] = [
  { id: 1, nome: 'Vermelho' },
  { id: 2, nome: 'Azul' },
  { id: 3, nome: 'Preto' },
  { id: 4, nome: 'Rosa' },
  { id: 5, nome: 'Cinza' },
  { id: 6, nome: 'Verde' },
  { id: 7, nome: 'Bege' },
];

export const materiais: Dominio[] = [
  { id: 1, nome: 'Algodão' },
  { id: 2, nome: 'Poliéster' },
  { id: 3, nome: 'Nylon' },
  { id: 4, nome: 'Couro sintético' },
  { id: 5, nome: 'Lã' },
  { id: 6, nome: 'Silicone' },
];

/**
 * Faixas de peso do porte, usadas pelos filtros do catálogo. O porte do
 * produto em si é gravado no enum PorteSigla, como no cadastro de pet.
 */
export const portes: { id: number; sigla: PorteSigla; nome: string; pesoMin: number; pesoMax: number }[] = [
  { id: 1, sigla: 'PP', nome: 'PP (até 3 kg)', pesoMin: 0, pesoMax: 3 },
  { id: 2, sigla: 'P', nome: 'P (3 a 7 kg)', pesoMin: 3, pesoMax: 7 },
  { id: 3, sigla: 'M', nome: 'M (7 a 15 kg)', pesoMin: 7, pesoMax: 15 },
  { id: 4, sigla: 'G', nome: 'G (15 a 30 kg)', pesoMin: 15, pesoMax: 30 },
  { id: 5, sigla: 'GG', nome: 'GG (30 a 70 kg)', pesoMin: 30, pesoMax: 70 },
];

/** RN0050: toda entrada em estoque identifica o fornecedor. */
export const fornecedores: { id: number; nome: string; cnpj: string }[] = [
  { id: 1, nome: 'Distribuidora PetBrasil', cnpj: '12.345.678/0001-90' },
  { id: 2, nome: 'Importadora AnimalWear', cnpj: '98.765.432/0001-10' },
  { id: 3, nome: 'Tecidos & Cia', cnpj: '45.678.912/0001-33' },
];

// ---------------------------------------------------------------------------
// Catálogo (RF0011-RF0016)
// ---------------------------------------------------------------------------

export interface ProdutoSeed {
  id: number;
  sku: string;
  nome: string;
  descricao: string;
  marcaId: number;
  categoriaIds: number[];
  especie: Especie;
  porte: PorteSigla;
  corId: number;
  materialId: number;
  altura: number;
  largura: number;
  profundidade: number;
  peso: number;
  codigoBarras: string;
  grupoPrecificacaoId: number;
  valorCusto: number;
  /** Saldo inicial; o `seed.ts` o converte nos lotes da tabela de estoque. */
  quantidadeEstoque: number;
  ativo: boolean;
  totalVendido: number;
}

/**
 * Inclui de propósito itens inativos (PET-0015 e PET-0020) e itens sem
 * saldo (PET-0015 e PET-0017), para que os filtros da RF0015 e a validação
 * de disponibilidade da RN0031 tenham o que encontrar.
 */
export const produtos: ProdutoSeed[] = [
  {
    id: 1,
    sku: 'PET-0001',
    nome: 'Moletom Pet Cinza',
    descricao: 'Moletom de algodão flanelado com capuz, ideal para dias frios. Elástico na cintura e abertura para coleira.',
    marcaId: 1,
    categoriaIds: [1],
    especie: 'CAO',
    porte: 'M',
    corId: 5,
    materialId: 1,
    altura: 32,
    largura: 28,
    profundidade: 4,
    peso: 0.24,
    codigoBarras: '7891000100011',
    grupoPrecificacaoId: 1,
    valorCusto: 45,
    quantidadeEstoque: 18,
    ativo: true,
    totalVendido: 34,
  },
  {
    id: 2,
    sku: 'PET-0002',
    nome: 'Camiseta Listrada Pet',
    descricao: 'Camiseta leve de algodão com listras marinheiras, corte anatômico e costura reforçada.',
    marcaId: 2,
    categoriaIds: [1],
    especie: 'CAO',
    porte: 'P',
    corId: 2,
    materialId: 1,
    altura: 24,
    largura: 20,
    profundidade: 2,
    peso: 0.12,
    codigoBarras: '7891000100028',
    grupoPrecificacaoId: 1,
    valorCusto: 25,
    quantidadeEstoque: 42,
    ativo: true,
    totalVendido: 87,
  },
  {
    id: 3,
    sku: 'PET-0003',
    nome: 'Casaco Impermeável Dog',
    descricao: 'Casaco corta-vento impermeável com forro térmico e faixa refletiva para passeios noturnos.',
    marcaId: 3,
    categoriaIds: [1],
    especie: 'CAO',
    porte: 'G',
    corId: 3,
    materialId: 2,
    altura: 46,
    largura: 38,
    profundidade: 6,
    peso: 0.42,
    codigoBarras: '7891000100035',
    grupoPrecificacaoId: 2,
    valorCusto: 70,
    quantidadeEstoque: 9,
    ativo: true,
    totalVendido: 21,
  },
  {
    id: 4,
    sku: 'PET-0004',
    nome: 'Vestido Floral Pet',
    descricao: 'Vestido de algodão com estampa floral, saia rodada e fecho em velcro nas costas.',
    marcaId: 1,
    categoriaIds: [1],
    especie: 'CAO',
    porte: 'PP',
    corId: 4,
    materialId: 1,
    altura: 22,
    largura: 18,
    profundidade: 3,
    peso: 0.1,
    codigoBarras: '7891000100042',
    grupoPrecificacaoId: 2,
    valorCusto: 38,
    quantidadeEstoque: 15,
    ativo: true,
    totalVendido: 40,
  },
  {
    id: 5,
    sku: 'PET-0005',
    nome: 'Suéter de Lã para Gatos',
    descricao: 'Suéter de lã macia com gola alta, modelagem folgada que não prende os movimentos do gato.',
    marcaId: 4,
    categoriaIds: [1],
    especie: 'GATO',
    porte: 'PP',
    corId: 7,
    materialId: 5,
    altura: 20,
    largura: 17,
    profundidade: 3,
    peso: 0.09,
    codigoBarras: '7891000100059',
    grupoPrecificacaoId: 1,
    valorCusto: 32,
    quantidadeEstoque: 26,
    ativo: true,
    totalVendido: 52,
  },
  {
    id: 6,
    sku: 'PET-0006',
    nome: 'Coleira Peitoral Ajustável',
    descricao: 'Peitoral acolchoado com quatro pontos de ajuste e argola dupla, distribui a tração no peito.',
    marcaId: 5,
    categoriaIds: [3, 2],
    especie: 'CAO',
    porte: 'M',
    corId: 1,
    materialId: 3,
    altura: 12,
    largura: 30,
    profundidade: 5,
    peso: 0.18,
    codigoBarras: '7891000100066',
    grupoPrecificacaoId: 1,
    valorCusto: 40,
    quantidadeEstoque: 31,
    ativo: true,
    totalVendido: 76,
  },
  {
    id: 7,
    sku: 'PET-0007',
    nome: 'Coleira Antipulgas para Gatos',
    descricao: 'Coleira de silicone com liberação gradual de repelente, proteção de até 6 meses.',
    marcaId: 4,
    categoriaIds: [3],
    especie: 'GATO',
    porte: 'P',
    corId: 6,
    materialId: 6,
    altura: 2,
    largura: 34,
    profundidade: 1,
    peso: 0.03,
    codigoBarras: '7891000100073',
    grupoPrecificacaoId: 3,
    valorCusto: 18,
    quantidadeEstoque: 60,
    ativo: true,
    totalVendido: 130,
  },
  {
    id: 8,
    sku: 'PET-0008',
    nome: 'Guia Retrátil 5 metros',
    descricao: 'Guia retrátil com fita de nylon de 5 metros, trava de segurança e pegada emborrachada.',
    marcaId: 3,
    categoriaIds: [2],
    especie: 'CAO',
    porte: 'G',
    corId: 3,
    materialId: 3,
    altura: 14,
    largura: 12,
    profundidade: 5,
    peso: 0.28,
    codigoBarras: '7891000100080',
    grupoPrecificacaoId: 1,
    valorCusto: 55,
    quantidadeEstoque: 12,
    ativo: true,
    totalVendido: 44,
  },
  {
    id: 9,
    sku: 'PET-0009',
    nome: 'Cama Iglu Premium',
    descricao: 'Cama fechada em formato iglu com base antiderrapante e almofada removível para lavagem.',
    marcaId: 6,
    categoriaIds: [5],
    especie: 'GATO',
    porte: 'M',
    corId: 5,
    materialId: 2,
    altura: 40,
    largura: 45,
    profundidade: 45,
    peso: 1.2,
    codigoBarras: '7891000100097',
    grupoPrecificacaoId: 2,
    valorCusto: 120,
    quantidadeEstoque: 7,
    ativo: true,
    totalVendido: 18,
  },
  {
    id: 10,
    sku: 'PET-0010',
    nome: 'Cama Retangular Conforto',
    descricao: 'Cama retangular com bordas elevadas e enchimento em fibra siliconada, capa 100% algodão.',
    marcaId: 6,
    categoriaIds: [5],
    especie: 'CAO',
    porte: 'GG',
    corId: 7,
    materialId: 1,
    altura: 22,
    largura: 90,
    profundidade: 70,
    peso: 2.4,
    codigoBarras: '7891000100103',
    grupoPrecificacaoId: 1,
    valorCusto: 150,
    quantidadeEstoque: 5,
    ativo: true,
    totalVendido: 11,
  },
  {
    id: 11,
    sku: 'PET-0011',
    nome: 'Brinquedo Mordedor Osso',
    descricao: 'Mordedor em silicone atóxico com textura massageadora, ajuda na higiene bucal.',
    marcaId: 2,
    categoriaIds: [4],
    especie: 'CAO',
    porte: 'M',
    corId: 1,
    materialId: 6,
    altura: 6,
    largura: 18,
    profundidade: 6,
    peso: 0.15,
    codigoBarras: '7891000100110',
    grupoPrecificacaoId: 3,
    valorCusto: 15,
    quantidadeEstoque: 80,
    ativo: true,
    totalVendido: 210,
  },
  {
    id: 12,
    sku: 'PET-0012',
    nome: 'Ratinho de Pelúcia com Catnip',
    descricao: 'Ratinho de pelúcia recheado com catnip natural, estimula o instinto de caça do gato.',
    marcaId: 4,
    categoriaIds: [4],
    especie: 'GATO',
    porte: 'PP',
    corId: 5,
    materialId: 2,
    altura: 5,
    largura: 12,
    profundidade: 5,
    peso: 0.04,
    codigoBarras: '7891000100127',
    grupoPrecificacaoId: 3,
    valorCusto: 12,
    quantidadeEstoque: 95,
    ativo: true,
    totalVendido: 188,
  },
  {
    id: 13,
    sku: 'PET-0013',
    nome: 'Bandana Pet Xadrez',
    descricao: 'Bandana de algodão com padrão xadrez e ajuste por nó, veste sobre qualquer coleira.',
    marcaId: 1,
    categoriaIds: [2],
    especie: 'CAO',
    porte: 'P',
    corId: 1,
    materialId: 1,
    altura: 18,
    largura: 24,
    profundidade: 1,
    peso: 0.03,
    codigoBarras: '7891000100134',
    grupoPrecificacaoId: 3,
    valorCusto: 10,
    quantidadeEstoque: 120,
    ativo: true,
    totalVendido: 165,
  },
  {
    id: 14,
    sku: 'PET-0014',
    nome: 'Capa de Chuva Transparente',
    descricao: 'Capa de chuva com capuz e barra elástica, PVC transparente com viés colorido.',
    marcaId: 3,
    categoriaIds: [1, 2],
    especie: 'CAO',
    porte: 'GG',
    corId: 2,
    materialId: 2,
    altura: 55,
    largura: 44,
    profundidade: 5,
    peso: 0.36,
    codigoBarras: '7891000100141',
    grupoPrecificacaoId: 2,
    valorCusto: 85,
    quantidadeEstoque: 6,
    ativo: true,
    totalVendido: 14,
  },
  {
    id: 15,
    sku: 'PET-0015',
    nome: 'Pijama Pet Estrelas',
    descricao: 'Pijama de malha com estampa de estrelas, punhos canelados e traseira aberta.',
    marcaId: 1,
    categoriaIds: [1],
    especie: 'CAO',
    porte: 'M',
    corId: 2,
    materialId: 1,
    altura: 34,
    largura: 27,
    profundidade: 4,
    peso: 0.2,
    codigoBarras: '7891000100158',
    grupoPrecificacaoId: 1,
    valorCusto: 42,
    quantidadeEstoque: 0,
    ativo: false,
    totalVendido: 8,
  },
  {
    id: 16,
    sku: 'PET-0016',
    nome: 'Coleira de Couro Luxo',
    descricao: 'Coleira em couro sintético com fivela metálica banhada e costura dupla à mão.',
    marcaId: 5,
    categoriaIds: [3],
    especie: 'CAO',
    porte: 'G',
    corId: 3,
    materialId: 4,
    altura: 3,
    largura: 52,
    profundidade: 1,
    peso: 0.16,
    codigoBarras: '7891000100165',
    grupoPrecificacaoId: 4,
    valorCusto: 90,
    quantidadeEstoque: 10,
    ativo: true,
    totalVendido: 9,
  },
  {
    id: 17,
    sku: 'PET-0017',
    nome: 'Gravata Borboleta Pet',
    descricao: 'Gravata borboleta com elástico ajustável, acabamento acetinado para ocasiões especiais.',
    marcaId: 1,
    categoriaIds: [2],
    especie: 'OUTRO',
    porte: 'PP',
    corId: 3,
    materialId: 2,
    altura: 6,
    largura: 10,
    profundidade: 2,
    peso: 0.02,
    codigoBarras: '7891000100172',
    grupoPrecificacaoId: 3,
    valorCusto: 8,
    quantidadeEstoque: 0,
    ativo: true,
    totalVendido: 3,
  },
  {
    id: 18,
    sku: 'PET-0018',
    nome: 'Body Antialérgico',
    descricao: 'Body pós-cirúrgico em algodão hipoalergênico, protege curativos e reduz lambedura.',
    marcaId: 6,
    categoriaIds: [1],
    especie: 'CAO',
    porte: 'P',
    corId: 7,
    materialId: 1,
    altura: 30,
    largura: 22,
    profundidade: 3,
    peso: 0.14,
    codigoBarras: '7891000100189',
    grupoPrecificacaoId: 1,
    valorCusto: 48,
    quantidadeEstoque: 22,
    ativo: true,
    totalVendido: 61,
  },
  {
    id: 19,
    sku: 'PET-0019',
    nome: 'Arranhador Torre',
    descricao: 'Torre com dois níveis, poste de sisal e nicho acolchoado; serve de arranhador e de cama.',
    marcaId: 6,
    categoriaIds: [4, 5],
    especie: 'GATO',
    porte: 'G',
    corId: 7,
    materialId: 2,
    altura: 92,
    largura: 40,
    profundidade: 40,
    peso: 8.5,
    codigoBarras: '7891000100196',
    grupoPrecificacaoId: 2,
    valorCusto: 180,
    quantidadeEstoque: 4,
    ativo: true,
    totalVendido: 7,
  },
  {
    id: 20,
    sku: 'PET-0020',
    nome: 'Botinha Antiderrapante (4 unidades)',
    descricao: 'Jogo com quatro botinhas de silicone antiderrapante, protegem as patas em pisos quentes.',
    marcaId: 5,
    categoriaIds: [2],
    especie: 'CAO',
    porte: 'M',
    corId: 3,
    materialId: 6,
    altura: 8,
    largura: 7,
    profundidade: 7,
    peso: 0.11,
    codigoBarras: '7891000100202',
    grupoPrecificacaoId: 1,
    valorCusto: 60,
    quantidadeEstoque: 3,
    ativo: false,
    totalVendido: 12,
  },
];

// ---------------------------------------------------------------------------
// Cupons (RF0037, RF0045)
// ---------------------------------------------------------------------------

export interface CupomSeed {
  id: number;
  codigo: string;
  tipo: TipoCupom;
  valor: number;
  /** Dias a contar de hoje; negativo nasce vencido. */
  validadeEmDias: number;
  utilizado: boolean;
  clienteId: number | null;
}

/**
 * Os três primeiros cupons de troca reproduzem o exemplo da RN0036 — 20,
 * 40 e 35 numa compra de 50 — para que a geração do cupom com a diferença
 * possa ser demonstrada. O promocional é geral e não tem dono (RN0033).
 */
export const cupons: CupomSeed[] = [
  { id: 1, codigo: 'TROCA-A20', tipo: 'TROCA', valor: 20, validadeEmDias: 180, utilizado: false, clienteId: 1 },
  { id: 2, codigo: 'TROCA-B40', tipo: 'TROCA', valor: 40, validadeEmDias: 180, utilizado: false, clienteId: 1 },
  { id: 3, codigo: 'TROCA-C35', tipo: 'TROCA', valor: 35, validadeEmDias: 180, utilizado: false, clienteId: 1 },
  { id: 4, codigo: 'TROCA-D15', tipo: 'TROCA', valor: 15, validadeEmDias: 90, utilizado: true, clienteId: 1 },
  { id: 5, codigo: 'TROCA-E60', tipo: 'TROCA', valor: 60, validadeEmDias: -10, utilizado: false, clienteId: 1 },
  { id: 6, codigo: 'TROCA-F30', tipo: 'TROCA', valor: 30, validadeEmDias: 150, utilizado: false, clienteId: 2 },
  { id: 7, codigo: 'BEMVINDO10', tipo: 'PROMOCIONAL', valor: 10, validadeEmDias: 365, utilizado: false, clienteId: null },
  { id: 8, codigo: 'PETLOVER25', tipo: 'PROMOCIONAL', valor: 25, validadeEmDias: 60, utilizado: false, clienteId: null },
  { id: 9, codigo: 'INVERNO50', tipo: 'PROMOCIONAL', valor: 50, validadeEmDias: 30, utilizado: false, clienteId: null },
  { id: 10, codigo: 'NATAL2024', tipo: 'PROMOCIONAL', valor: 40, validadeEmDias: -200, utilizado: false, clienteId: null },
];
