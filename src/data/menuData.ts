import { MenuItem } from '../types';
import { getAssetUrl } from './assets';

export const MENU_ITEMS: MenuItem[] = [
  // Carnes Nobres
  {
    id: 'tomahawk-maturado',
    name: 'Tomahawk Maturado',
    price: 84.0,
    currency: '€',
    category: 'carnes',
    badge: 'Dry-Aged 60D',
    tagline: 'Ideal para 2 Pessoas',
    description: 'Aproximadamente 1.2kg de carne marmorizada, assada ao osso sobre brasa lenta de azinho. Acompanha flor de sal de Castro Marim e puré de batata trufado.',
    imageUrl: getAssetUrl('dish-tomahawk'),
    dryAgedDays: 60,
    servesCount: '2 a 3 pessoas',
    origin: 'Vaca Velha Minhota DOP',
    pairingWine: 'Quinta da Gaivosa Tinto Douro 2017',
    isChefSpecial: true
  },
  {
    id: 'costelao-no-fogo',
    name: 'Costelão no Fogo',
    price: 68.0,
    currency: '€',
    category: 'carnes',
    badge: 'Braseado 8h',
    tagline: 'Carne Desfeita com Garfo',
    description: 'Costela bovina de pasto marinada com zimbro, louro e vinho tinto minhoto, cozida em baixa temperatura por 8 horas e selada na brasa de carvalho.',
    imageUrl: getAssetUrl('dish-costelao'),
    dryAgedDays: 30,
    servesCount: '2 pessoas',
    origin: 'Barrosã DOP',
    pairingWine: 'Pêra-Manca Tinto Alentejo 2015',
    isChefSpecial: true
  },
  {
    id: 'bife-do-lombo',
    name: 'Bife do Lombo',
    price: 32.0,
    currency: '€',
    category: 'carnes',
    badge: 'Corte Nobre',
    tagline: 'Maciez Absoluta',
    description: 'Lombo premium temperado com manteiga clarificada de alho confitado e ervas do monte. Servido com legumes grelhados sazonais e jus de carne reduzido.',
    imageUrl: getAssetUrl('dish-lombo'),
    dryAgedDays: 21,
    servesCount: '1 pessoa',
    origin: 'Novilho Nacional Certificado',
    pairingWine: 'Meandro do Vale Meão Douro 2020',
    isChefSpecial: true
  },
  {
    id: 'chuleton-minhoto',
    name: 'Chuletón da Galiza & Minho',
    price: 76.0,
    currency: '€',
    category: 'carnes',
    badge: 'Dry-Aged 45D',
    tagline: 'Gordura Amarela Nobre',
    description: 'Corte alto de costeletão maturada com cobertura de gordura untuosa e sabor profundo aveludado pelas brasas vivas.',
    imageUrl: getAssetUrl('dish-tomahawk'),
    dryAgedDays: 45,
    servesCount: '2 pessoas',
    origin: 'Rubia Galega / Minhota',
    pairingWine: 'Duas Quintas Reserva Especial 2018'
  },
  {
    id: 'picanha-black-angus',
    name: 'Picanha Black Angus Seleção',
    price: 34.5,
    currency: '€',
    category: 'carnes',
    badge: 'Corte da Brasa',
    tagline: 'Suculência Incomparável',
    description: 'Fatias espessas de picanha grelhadas com crosta estaladiça de sal marinho e centro avermelhado suculento. Acompanha farofa de mandioca e vinagrete da horta.',
    imageUrl: getAssetUrl('dish-lombo'),
    dryAgedDays: 28,
    servesCount: '1 pessoa',
    origin: 'Black Angus Prime',
    pairingWine: 'Esporão Reserva Tinto 2021'
  },

  // Mar & Entradas
  {
    id: 'polvo-no-carvao',
    name: 'Polvo no Carvão',
    price: 29.5,
    currency: '€',
    category: 'mar',
    badge: 'Da Costa',
    tagline: 'Frescura Atlântica',
    description: 'Tentáculo crocante por fora e tenro por dentro, batata a murro estalada, grelos salteados e azeite virgem extra DOP de Trás-os-Montes.',
    imageUrl: getAssetUrl('dish-polvo'),
    servesCount: '1 pessoa',
    origin: 'Costa de Viana do Castelo',
    pairingWine: 'Soalheiro Alvarinho Reserva Monção e Melgaço 2022',
    isChefSpecial: true
  },
  {
    id: 'gambao-na-grelha',
    name: 'Gambão Tigre na Grelha',
    price: 24.0,
    currency: '€',
    category: 'mar',
    badge: 'Mar & Brasa',
    tagline: 'Aroma Defumado Intenso',
    description: 'Camarões tigre selvagens perfumados com manteiga de piri-piri doce, flor de sal e raspas de lima verde.',
    imageUrl: getAssetUrl('dish-gambao'),
    servesCount: '1 a 2 pessoas',
    origin: 'Atlântico Selvagem',
    pairingWine: 'Niepoort Redoma Branco Douro'
  },
  {
    id: 'carpaccio-maturado',
    name: 'Carpaccio Maturado',
    price: 18.0,
    currency: '€',
    category: 'entradas',
    badge: 'Entrada de Assinatura',
    tagline: 'Delicadeza & Textura',
    description: 'Lâminas finíssimas de lombo maturado 45 dias com trufa negra fresca laminada, lascas de queijo São Jorge curado 24 meses e azeite virgem extra.',
    imageUrl: getAssetUrl('dish-carpaccio'),
    servesCount: '1 a 2 pessoas',
    origin: 'Lombo Maturado da Casa',
    pairingWine: 'Quinta dos Carvalhais Branco Dão 2021'
  },
  {
    id: 'croquetes-rabo-boi',
    name: 'Croquetes de Rabo de Boi',
    price: 12.5,
    currency: '€',
    category: 'entradas',
    badge: 'Aperitivo',
    tagline: 'Crocante & Aveludado',
    description: 'Confeção lenta de 14 horas com emulsão aveludada de mostarda antiga de Dijon e pickles artesanais da horta minhota.',
    imageUrl: getAssetUrl('dish-croquetes'),
    servesCount: '4 unidades',
    pairingWine: 'Espumante Murganheira Reserva Bruto'
  },
  {
    id: 'tutano-assado',
    name: 'Tutano Assado na Brasa',
    price: 16.0,
    currency: '€',
    category: 'entradas',
    badge: 'Para Partilhar',
    tagline: 'Intensidade & Fumo',
    description: 'Tutano cortado longitudinalmente com chimichurri fresco de ervas do monte, flor de sal e fatias de pão de fermentação lenta tostadas nas brasas.',
    imageUrl: getAssetUrl('dish-tutano'),
    servesCount: '2 pessoas',
    pairingWine: 'Carm Reserva Tinto Douro'
  },

  // Acompanhamentos
  {
    id: 'pure-trufado',
    name: 'Puré de Batata Ratte Trufado',
    price: 8.5,
    currency: '€',
    category: 'acompanhamentos',
    badge: 'Guarnição de Ouro',
    description: 'Puré aveludado com manteiga dos Açores e pasta de trufa preta de Norcia.',
    imageUrl: getAssetUrl('dish-lombo')
  },
  {
    id: 'grelos-salteados',
    name: 'Grelos Salteados em Azeite & Alho Confitado',
    price: 6.5,
    currency: '€',
    category: 'acompanhamentos',
    badge: 'Tradição do Minho',
    description: 'Grelos tenros da região de Prado salteados na brasa com alho laminado e azeite virgem.',
    imageUrl: getAssetUrl('dish-polvo')
  },

  // Sobremesas
  {
    id: 'mil-folhas-caramelizado',
    name: 'Mil-Folhas com Baunilha de Madagáscar & Caramelo Salgado',
    price: 10.5,
    currency: '€',
    category: 'sobremesas',
    badge: 'Assinatura Doce',
    description: 'Massa folhada estaladiça caramelizada com creme diplomata de baunilha Bourbon e flor de sal.',
    imageUrl: getAssetUrl('dish-carpaccio')
  },
  {
    id: 'texturas-chocolate-fumo',
    name: 'Cacau 70% com Gelado de Fumo de Carvalho & Avelã',
    price: 11.0,
    currency: '€',
    category: 'sobremesas',
    badge: 'Experiência Telúrica',
    description: 'Ganache de cacau de origem única, crumble de avelã tostada e gelado artesanal com infusão subtil de fumo de carvalho.',
    imageUrl: getAssetUrl('dish-costelao')
  },

  // Carta de Vinhos
  {
    id: 'vinho-quinta-do-porto-reserva',
    name: 'Quinta do Porto Reserva Tinto',
    price: 38.0,
    currency: '€',
    category: 'vinhos',
    badge: 'Reserva',
    tagline: 'Douro DOC',
    description: 'Baga de Touriga Franca e Touriga Nacional, 18 meses em barrica de carvalho francês. Taninos sedosos, notas de ameixa negra, especiaria e cacau. Ideal com carnes na brasa.',
    imageUrl: '',
    origin: 'Douro DOC',
    pairingWine: 'Touriga Franca > Touriga Nacional'
  },
  {
    id: 'vinho-pontes-tinto',
    name: 'Ponte da Barca Tinto de Talha',
    price: 28.5,
    currency: '€',
    category: 'vinhos',
    badge: 'Vinho de Talha',
    tagline: 'Alentejo DOC',
    description: 'Vinificação ancestral em ânfora de barro. Fruta madura, textura terrosa e final fresco. Companheiro direto do Costelão no Fogo.',
    imageUrl: '',
    origin: 'Alentejo DOC',
    pairingWine: 'Alicante Bouschet > Trincadeira'
  },
  {
    id: 'vinho-bairrada-espumante',
    name: 'Bairrada Espumante Brut Nature',
    price: 32.0,
    currency: '€',
    category: 'vinhos',
    badge: 'Espumante',
    tagline: 'Método Clássico',
    description: 'Baga Baião de longa maturação, bolha fina e vivaz. Entrada obrigatória: acompanha o Tutano Assado e o Carpaccio 45D.',
    imageUrl: '',
    origin: 'Bairrada DOC',
    pairingWine: 'Baga'
  },
  {
    id: 'vinho-alvarinho-moncao',
    name: 'Alvarinho da Monção e Melgaço',
    price: 24.0,
    currency: '€',
    category: 'vinhos',
    badge: 'Branco',
    tagline: 'Monção e Melgaço DOC',
    description: 'Citrino, mineral e vibrante, com tensão de mar e granito. Perfeito para o Polvo no Carvão e o Gambão Tigre.',
    imageUrl: '',
    origin: 'Monção e Melgaço DOC',
    pairingWine: 'Alvarinho'
  },
  {
    id: 'vinho-loureiro-vinho-verde',
    name: 'Loureiro da Região dos Vinhos Verdes',
    price: 16.5,
    currency: '€',
    category: 'vinhos',
    badge: 'Vinho Verde',
    tagline: 'Vinho Verde DOC',
    description: 'Fresco, floral e ligeiramente frisante, direto das vinhas do Cávado. Prova da casa para o início da noite.',
    imageUrl: '',
    origin: 'Vinho Verde DOC',
    pairingWine: 'Loureiro'
  },
  {
    id: 'vinho-rose-quinta-das-asas',
    name: 'Quinta das Aves Rosé de Pinot Noir',
    price: 27.0,
    currency: '€',
    category: 'vinhos',
    badge: 'Rosé',
    tagline: 'Terras de Lisboa DOC',
    description: 'Rosé delicado de Pinot Noir com notas de morango, framboesa e flor de laranjeira. Leve e gastronómico.',
    imageUrl: '',
    origin: 'Terras de Lisboa DOC',
    pairingWine: 'Pinot Noir'
  }
];
