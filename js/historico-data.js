/* ============================================================
   DADOS MOCKADOS — Histórico
   Em produção, substitua por chamada à API.
   ============================================================ */

const HISTORY_DATA = [
  { id: 'MOV-2025-0130', type: 'entrada', category: 'recarga',   description: 'Recarga via PIX',                    value: 100.00, date: '2025-06-15T14:22:00', paymentMethod: 'PIX · Mercado Pago', status: 'aprovado',  balanceAfter: 245.80, receipt: true },
  { id: 'MOV-2025-0129', type: 'saida',   category: 'compra',    description: 'Compra · Netflix Premium 4K',         value: 55.90,  date: '2025-06-15T14:10:00', paymentMethod: 'Saldo da carteira',  status: 'aprovado',  balanceAfter: 145.80, receipt: true },
  { id: 'MOV-2025-0128', type: 'entrada', category: 'recarga',   description: 'Recarga via PIX',                    value: 50.00,  date: '2025-06-14T09:45:00', paymentMethod: 'PIX · Mercado Pago', status: 'pendente',  balanceAfter: null,   receipt: false },
  { id: 'MOV-2025-0127', type: 'saida',   category: 'renovacao', description: 'Renovação · Spotify Premium',         value: 21.90,  date: '2025-06-13T11:00:00', paymentMethod: 'Saldo da carteira',  status: 'aprovado',  balanceAfter: 201.70, receipt: true },
  { id: 'MOV-2025-0126', type: 'saida',   category: 'compra',    description: 'Compra · Max Premium 4K',             value: 449.90, date: '2025-06-10T11:25:00', paymentMethod: 'Cartão de crédito',  status: 'recusado',  balanceAfter: null,   receipt: false },
  { id: 'MOV-2025-0125', type: 'entrada', category: 'estorno',   description: 'Estorno · Apple TV+',                 value: 29.90,  date: '2025-06-07T09:00:00', paymentMethod: 'Cartão de crédito',  status: 'aprovado',  balanceAfter: 223.60, receipt: true },
  { id: 'MOV-2025-0124', type: 'entrada', category: 'recarga',   description: 'Recarga via PIX',                    value: 300.00, date: '2025-06-01T20:10:00', paymentMethod: 'PIX · Mercado Pago', status: 'aprovado',  balanceAfter: 193.70, receipt: true },
  { id: 'MOV-2025-0123', type: 'saida',   category: 'pagamento', description: 'Pagamento de fatura',                 value: 30.00,  date: '2025-05-28T15:30:00', paymentMethod: 'Saldo da carteira',  status: 'cancelado', balanceAfter: null,   receipt: false },
  { id: 'MOV-2025-0122', type: 'saida',   category: 'renovacao', description: 'Renovação · Disney+ Premium Anual',   value: 279.90, date: '2025-05-27T10:00:00', paymentMethod: 'PIX · Mercado Pago', status: 'aprovado',  balanceAfter: 163.70, receipt: true },
  { id: 'MOV-2025-0121', type: 'saida',   category: 'compra',    description: 'Compra · Prime Video Mensal',         value: 19.90,  date: '2025-05-22T16:40:00', paymentMethod: 'Saldo da carteira',  status: 'aprovado',  balanceAfter: 443.60, receipt: true },
  { id: 'MOV-2025-0120', type: 'entrada', category: 'estorno',   description: 'Estorno · Prime Video (boleto)',      value: 19.90,  date: '2025-05-20T11:15:00', paymentMethod: 'Boleto',             status: 'aprovado',  balanceAfter: 463.50, receipt: true },
  { id: 'MOV-2025-0119', type: 'saida',   category: 'compra',    description: 'Compra · Globoplay Padrão',           value: 29.90,  date: '2025-05-18T09:30:00', paymentMethod: 'Saldo da carteira',  status: 'aprovado',  balanceAfter: 443.60, receipt: true },
  { id: 'MOV-2025-0118', type: 'entrada', category: 'recarga',   description: 'Recarga via PIX',                    value: 200.00, date: '2025-05-15T19:00:00', paymentMethod: 'PIX · Mercado Pago', status: 'aprovado',  balanceAfter: 473.50, receipt: true },
  { id: 'MOV-2025-0117', type: 'saida',   category: 'renovacao', description: 'Renovação · Spotify Premium',         value: 21.90,  date: '2025-05-13T11:00:00', paymentMethod: 'Saldo da carteira',  status: 'aprovado',  balanceAfter: 273.50, receipt: true },
  { id: 'MOV-2025-0116', type: 'saida',   category: 'compra',    description: 'Compra · Paramount+ Mensal',          value: 19.90,  date: '2025-05-10T14:00:00', paymentMethod: 'Cartão de crédito',  status: 'aprovado',  balanceAfter: 295.40, receipt: true },
  { id: 'MOV-2025-0115', type: 'entrada', category: 'ajuste',    description: 'Ajuste de crédito · cupom de boas-vindas', value: 15.00, date: '2025-05-08T10:00:00', paymentMethod: '—',                  status: 'aprovado',  balanceAfter: 315.30, receipt: true },
  { id: 'MOV-2025-0114', type: 'saida',   category: 'compra',    description: 'Compra · Star+ Combo Anual',          value: 359.90, date: '2025-05-05T22:45:00', paymentMethod: 'PIX · Mercado Pago', status: 'aprovado',  balanceAfter: 300.30, receipt: true },
  { id: 'MOV-2025-0113', type: 'saida',   category: 'renovacao', description: 'Renovação · Deezer Premium',          value: 20.90,  date: '2025-05-03T08:15:00', paymentMethod: 'Cartão de crédito',  status: 'recusado',  balanceAfter: null,   receipt: false },
  { id: 'MOV-2025-0112', type: 'entrada', category: 'recarga',   description: 'Recarga via PIX',                    value: 500.00, date: '2025-05-01T21:20:00', paymentMethod: 'PIX · Mercado Pago', status: 'aprovado',  balanceAfter: 660.20, receipt: true },
  { id: 'MOV-2025-0111', type: 'saida',   category: 'pagamento', description: 'Retirada para chave PIX',             value: 100.00, date: '2025-04-28T15:30:00', paymentMethod: 'PIX · Mercado Pago', status: 'aprovado',  balanceAfter: 160.20, receipt: true },
  { id: 'MOV-2025-0110', type: 'entrada', category: 'estorno',   description: 'Estorno · Apple TV+',                 value: 29.90,  date: '2025-04-22T12:10:00', paymentMethod: 'Cartão de crédito',  status: 'aprovado',  balanceAfter: 260.20, receipt: true },
  { id: 'MOV-2025-0109', type: 'saida',   category: 'compra',    description: 'Compra · Netflix Padrão',             value: 39.90,  date: '2025-04-18T19:40:00', paymentMethod: 'Saldo da carteira',  status: 'aprovado',  balanceAfter: 230.30, receipt: true },
  { id: 'MOV-2025-0108', type: 'entrada', category: 'ajuste',    description: 'Ajuste manual · correção de cobrança',value: 5.00,   date: '2025-04-15T10:00:00', paymentMethod: '—',                  status: 'aprovado',  balanceAfter: 270.20, receipt: true },
  { id: 'MOV-2025-0107', type: 'saida',   category: 'renovacao', description: 'Renovação · Disney+ Premium Anual',   value: 279.90, date: '2025-04-12T09:00:00', paymentMethod: 'PIX · Mercado Pago', status: 'aprovado',  balanceAfter: 265.20, receipt: true },
  { id: 'MOV-2025-0106', type: 'saida',   category: 'compra',    description: 'Compra · Max Premium 4K Anual',       value: 449.90, date: '2025-04-05T14:00:00', paymentMethod: 'PIX · Mercado Pago', status: 'aprovado',  balanceAfter: 545.10, receipt: true },
  { id: 'MOV-2025-0105', type: 'entrada', category: 'recarga',   description: 'Recarga via PIX',                    value: 300.00, date: '2025-04-01T18:00:00', paymentMethod: 'PIX · Mercado Pago', status: 'aprovado',  balanceAfter: 995.00, receipt: true },
  { id: 'MOV-2025-0104', type: 'saida',   category: 'compra',    description: 'Compra · Spotify Premium Individual', value: 21.90,  date: '2025-03-28T10:00:00', paymentMethod: 'Saldo da carteira',  status: 'aprovado',  balanceAfter: 695.00, receipt: true },
  { id: 'MOV-2025-0103', type: 'saida',   category: 'renovacao', description: 'Renovação · Globoplay Padrão',        value: 29.90,  date: '2025-03-22T16:30:00', paymentMethod: 'PIX · Mercado Pago', status: 'aprovado',  balanceAfter: 716.90, receipt: true },
  { id: 'MOV-2025-0102', type: 'entrada', category: 'estorno',   description: 'Estorno · cobrança duplicada',        value: 55.90,  date: '2025-03-20T11:20:00', paymentMethod: 'Cartão de crédito',  status: 'aprovado',  balanceAfter: 746.80, receipt: true },
];

const HISTORY_NOTIFICATIONS = [
  { type: 'ok',   title: 'Recarga confirmada',    sub: 'R$ 100,00 creditados via PIX em 15/06', unread: true,  ref: 'MOV-2025-0130' },
  { type: 'warn', title: 'Recarga pendente',      sub: 'R$ 50,00 aguardando confirmação do PIX', unread: true,  ref: 'MOV-2025-0128' },
  { type: 'err',  title: 'Pagamento recusado',    sub: 'Max Premium 4K · cartão recusado em 10/06', unread: false, ref: 'MOV-2025-0126' },
];
