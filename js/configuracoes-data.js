/* ============================================================
   CONFIGURAÇÕES — dados, defaults e opções
   ============================================================ */

const SETTINGS_KEY = 'streamly-settings';
const THEME_KEY    = 'streamly-theme';

const SETTINGS_DEFAULTS = {
  appearance: {
    primary: 'red',
    cardStyle: 'rounded',
    fontSize: 'md',
    contrastHigh: false,
    reduceAnimations: false,
    improveReadability: false,
  },
  region: {
    language: 'pt-BR',
    country: 'BR',
    timezone: 'America/Sao_Paulo',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    currency: 'BRL',
  },
  notifications: {
    master: true,
    purchases: true,
    payments: true,
    expiration: true,
    renewal: true,
    news: false,
    email: {
      receipts: true,
      statements: true,
      orders: true,
      subscriptions: true,
      offers: false,
    },
    whatsapp: {
      enabled: true,
      orders: true,
      dueDate: true,
      payments: true,
    },
  },
  privacy: {
    dataConsent: true,
    cookiesConsent: true,
    marketing: false,
  },
  security: {
    twoFactor: true,
    accessAlertsNewDevice: true,
    accessAlertsNewLocation: true,
  },
  store: {
    showAvailable: true,
    showSoldOut: true,
    personalRecommendations: true,
    favoriteCategories: ['Filmes e séries', 'Música', 'Esportes'],
  },
};

const LANGUAGE_OPTIONS = [
  { value: 'pt-BR', label: 'Português (Brasil)' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'es-ES', label: 'Español' },
];

const COUNTRY_OPTIONS = [
  { value: 'BR', label: 'Brasil' },
  { value: 'US', label: 'Estados Unidos' },
  { value: 'PT', label: 'Portugal' },
  { value: 'AR', label: 'Argentina' },
  { value: 'MX', label: 'México' },
];

const TIMEZONE_OPTIONS = [
  { value: 'America/Sao_Paulo', label: 'São Paulo (GMT-3)' },
  { value: 'America/Manaus',    label: 'Manaus (GMT-4)' },
  { value: 'America/Rio_Branco',label: 'Rio Branco (GMT-5)' },
  { value: 'America/New_York',  label: 'Nova York (GMT-5)' },
  { value: 'Europe/Lisbon',     label: 'Lisboa (GMT+0)' },
];

const STORE_CATEGORIES = [
  'Filmes e séries',
  'Música',
  'Esportes',
  'Infantil',
  'Documentários',
  'Cursos e educação',
  'Combos',
  'Promoções',
];

const SYSTEM_VERSION = '1.4.2';
