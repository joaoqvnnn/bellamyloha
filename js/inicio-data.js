/* ============================================================
   INÍCIO — dados agregados para o dashboard
   ============================================================ */

/* Stats do topo */
const HOME_STATS = {
  screens: { total: 5, active: 3, expiring: 1 },
  wallet: { balance: 245.80, pending: 50.00 },
  orders: { total: 8, pending: 2 },
  subscriptions: { total: 4, active: 3, nextDueIn: 13 },
};

/* Alertas que precisam de atenção */
const HOME_ALERTS = [
  {
    type: 'warn',
    icon: 'clock',
    title: 'Disney+ vence em 13 dias',
    text: 'Renove sua assinatura anual por R$ 279,90 para não perder o acesso.',
    action: 'assinaturas.html',
  },
  {
    type: 'err',
    icon: 'alert',
    title: 'Prime Video está vencida',
    text: 'Sua tela venceu em 10/05. Renove agora e recupere o acesso em minutos.',
    action: 'index.html',
  },
  {
    type: 'info',
    icon: 'wallet',
    title: 'Recarga pendente de R$ 50,00',
    text: 'Um PIX foi gerado em 14/06 e ainda não foi pago. Ele expira em breve.',
    action: 'carteira.html',
  },
];

/* Suas telas ativas (mini cards) */
const HOME_SCREENS = [
  {
    id: 'TL-2401-0001',
    platform: 'Netflix',
    platformColor: '#e50914',
    plan: 'Premium 4K',
    dueDate: '2025-07-15',
    status: 'ativa',
  },
  {
    id: 'TL-2401-0004',
    platform: 'Max',
    platformColor: '#002be7',
    plan: 'Premium 4K Anual',
    dueDate: '2026-03-22',
    status: 'ativa',
  },
  {
    id: 'TL-2401-0005',
    platform: 'Spotify',
    platformColor: '#1db954',
    plan: 'Premium Individual',
    dueDate: '2025-07-05',
    status: 'ativa',
  },
  {
    id: 'TL-2401-0006',
    platform: 'Globoplay',
    platformColor: '#ff4d00',
    plan: 'Padrão Mensal',
    dueDate: '2025-06-18',
    status: 'proxima',
  },
];

/* Produtos em destaque */
const HOME_FEATURED = [
  {
    id: 'netflix-4k',
    name: 'Netflix Premium 4K',
    platform: 'Netflix',
    platformColor: '#e50914',
    price: 55.90,
    oldPrice: 69.90,
    period: '/mês',
    delivery: 'auto',
    discount: 20,
  },
  {
    id: 'combo-netflix-spotify',
    name: 'Combo Netflix + Spotify',
    platform: 'Combo',
    platformColor: '#7a1f3d',
    price: 69.90,
    oldPrice: 79.80,
    period: '/mês',
    delivery: 'auto',
    discount: 12,
  },
  {
    id: 'disney-anual',
    name: 'Disney+ Premium Anual',
    platform: 'Disney+',
    platformColor: '#113ccf',
    price: 279.90,
    oldPrice: 359.90,
    period: '/ano',
    delivery: 'auto',
    discount: 22,
  },
  {
    id: 'max-4k-anual',
    name: 'Max Premium 4K Anual',
    platform: 'Max',
    platformColor: '#002be7',
    price: 449.90,
    oldPrice: 549.90,
    period: '/ano',
    delivery: 'auto',
    discount: 18,
  },
];

/* Recomendados para você */
const HOME_RECOMMENDED = [
  {
    id: 'prime-mensal',
    name: 'Prime Video Mensal',
    platform: 'Prime Video',
    platformColor: '#00a8e1',
    price: 19.90,
    oldPrice: null,
    period: '/mês',
    delivery: 'auto',
  },
  {
    id: 'globoplay-mensal',
    name: 'Globoplay Padrão',
    platform: 'Globoplay',
    platformColor: '#ff4d00',
    price: 29.90,
    oldPrice: null,
    period: '/mês',
    delivery: 'auto',
  },
  {
    id: 'appletv-mensal',
    name: 'Apple TV+ Mensal',
    platform: 'Apple TV+',
    platformColor: '#1a1a1a',
    price: 29.90,
    oldPrice: null,
    period: '/mês',
    delivery: 'auto',
  },
  {
    id: 'star-combo-anual',
    name: 'Star+ Combo Anual',
    platform: 'Star+',
    platformColor: '#ff6600',
    price: 359.90,
    oldPrice: 479.90,
    period: '/ano',
    delivery: 'manual',
  },
];

/* Últimos pedidos */
const HOME_RECENT_ORDERS = [
  {
    id: 'PED-2025-0048',
    platform: 'Netflix',
    platformColor: '#e50914',
    product: 'Netflix Premium 4K',
    value: 55.90,
    date: '2025-06-15T14:32:00',
    status: 'concluido',
  },
  {
    id: 'PED-2025-0047',
    platform: 'Disney+',
    platformColor: '#113ccf',
    product: 'Disney+ Premium Anual',
    value: 279.90,
    date: '2025-06-14T09:18:00',
    status: 'em_processamento',
  },
  {
    id: 'PED-2025-0046',
    platform: 'Spotify',
    platformColor: '#1db954',
    product: 'Spotify Premium Individual',
    value: 21.90,
    date: '2025-06-14T08:05:00',
    status: 'pendente',
  },
  {
    id: 'PED-2025-0045',
    platform: 'Prime Video',
    platformColor: '#00a8e1',
    product: 'Prime Video Mensal',
    value: 19.90,
    date: '2025-06-12T19:42:00',
    status: 'cancelado',
  },
];

/* Notificações do sino */
const HOME_NOTIFICATIONS = [
  {
    type: 'ok',
    title: 'Pedido PED-2025-0048 concluído',
    sub: 'Netflix Premium 4K — entregue em 15/06 às 14:36',
    unread: true,
  },
  {
    type: 'warn',
    title: 'Disney+ vence em 13 dias',
    sub: 'Renove para não perder o acesso',
    unread: true,
  },
  {
    type: 'err',
    title: 'Prime Video vencida',
    sub: 'Pagamento não confirmado em 10/05',
    unread: true,
  },
];
