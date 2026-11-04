/* ============================================================
   DADOS MOCKADOS — Perfil
   ============================================================ */

const PROFILE_DATA = {
  id: 'CLI-2024-0048',
  fullName: 'Carlos Henrique Oliveira',
  username: 'carlos.oliveira',
  birthDate: '1990-03-15',
  cpf: '153.591.456-78',
  phone: '11987654321',
  whatsapp: '11987654321',
  email: 'carlos.oliveira@email.com',
  avatarUrl: null,

  address: {
    cep: '01310-100',
    state: 'SP',
    city: 'São Paulo',
    neighborhood: 'Bela Vista',
    street: 'Avenida Paulista',
    number: '1000',
    complement: 'Apto 1502',
  },

  account: {
    status: 'ativa',          // ativa | suspensa | banida
    createdAt: '2024-08-12',
    passwordChangedAt: '2025-02-20',
    twoFactorEnabled: true,
  },

  preferences: {
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

  sessions: [
    {
      id: 's1',
      device: 'Chrome',
      os: 'Windows 11',
      location: 'São Paulo, SP',
      ip: '191.180.***.***',
      lastActive: '2025-06-15T14:30:00',
      current: true,
      type: 'desktop',
    },
    {
      id: 's2',
      device: 'Safari',
      os: 'iPhone 15',
      location: 'São Paulo, SP',
      ip: '191.180.***.***',
      lastActive: '2025-06-14T20:15:00',
      current: false,
      type: 'mobile',
    },
    {
      id: 's3',
      device: 'Firefox',
      os: 'Ubuntu 22.04',
      location: 'Campinas, SP',
      ip: '189.22.***.***',
      lastActive: '2025-06-10T09:12:00',
      current: false,
      type: 'desktop',
    },
  ],

  history: [
    { date: '2025-06-15T14:20', action: 'Sessão iniciada', detail: 'Chrome · Windows 11 · São Paulo, SP' },
    { date: '2025-06-10T09:12', action: 'Sessão iniciada', detail: 'Firefox · Ubuntu 22.04 · Campinas, SP' },
    { date: '2025-05-20T11:00', action: 'Preferências alteradas', detail: 'Ativou notificações por WhatsApp para pagamentos' },
    { date: '2025-04-02T16:40', action: 'E-mail alterado', detail: 'De ca***@gm***.com para carlos.oliveira@email.com (verificado)' },
    { date: '2025-02-20T09:30', action: 'Senha alterada', detail: 'Alteração feita com sucesso a partir de São Paulo, SP' },
    { date: '2024-08-12T10:15', action: 'Conta criada', detail: 'Cadastro inicial realizado' },
  ],
};

/* Motivos permitidos para solicitar alteração de CPF */
const CPF_CHANGE_REASONS = [
  { id: 'typo',      label: 'Erro de digitação no cadastro original' },
  { id: 'rectify',   label: 'Retificação de documento (Cartório)' },
  { id: 'judicial',  label: 'Determinação judicial' },
  { id: 'fraud',     label: 'Fraude / uso indevido do meu CPF' },
  { id: 'other',     label: 'Outro motivo (descrever abaixo)' },
];

/* Notificações */
const PROFILE_NOTIFICATIONS = [
  { type: 'info', title: 'Bem-vindo de volta', sub: 'Último acesso em 15/06 às 14:20', unread: true },
];
