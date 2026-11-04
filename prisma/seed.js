require('dotenv').config();
const prisma = require('../src/lib/prisma');
const bcrypt = require('bcryptjs');

const PRODUCTS = [
  { slug: 'netflix-4k', name: 'Netflix Premium 4K', platform: 'Netflix', platformColor: '#e50914', category: 'Filmes e séries', shortDesc: '4 telas simultâneas em 4K UHD', description: 'Experiência Netflix mais completa.', price: 55.90, oldPrice: 69.90, period: '/mês', delivery: 'auto', stock: 48, rating: 4.9, reviewCount: 234, sales: 1203 },
  { slug: 'netflix-padrao', name: 'Netflix Padrão', platform: 'Netflix', platformColor: '#e50914', category: 'Filmes e séries', shortDesc: '2 telas simultâneas em Full HD', description: 'Netflix em Full HD.', price: 39.90, period: '/mês', delivery: 'auto', stock: 62, rating: 4.7, reviewCount: 189, sales: 987 },
  { slug: 'disney-anual', name: 'Disney+ Premium Anual', platform: 'Disney+', platformColor: '#113ccf', category: 'Filmes e séries', shortDesc: '4K UHD · 4 telas · 12 meses', description: 'Um ano de Disney+.', price: 279.90, oldPrice: 359.90, period: '/ano', delivery: 'auto', stock: 32, rating: 4.8, reviewCount: 412, sales: 1892 },
  { slug: 'prime-mensal', name: 'Prime Video Mensal', platform: 'Prime Video', platformColor: '#00a8e1', category: 'Filmes e séries', shortDesc: '3 telas simultâneas em 4K', description: 'Prime Video completo.', price: 19.90, period: '/mês', delivery: 'auto', stock: 87, rating: 4.6, reviewCount: 156, sales: 743 },
  { slug: 'max-4k-anual', name: 'Max Premium 4K Anual', platform: 'Max', platformColor: '#002be7', category: 'Filmes e séries', shortDesc: '4K UHD · 4 telas · 12 meses', description: 'Todo o catálogo HBO.', price: 449.90, oldPrice: 549.90, period: '/ano', delivery: 'auto', stock: 18, rating: 4.8, reviewCount: 287, sales: 654 },
  { slug: 'spotify-individual', name: 'Spotify Premium Individual', platform: 'Spotify', platformColor: '#1db954', category: 'Música', shortDesc: 'Música sem anúncio · 1 conta', description: 'Spotify Premium completo.', price: 21.90, period: '/mês', delivery: 'auto', stock: 120, rating: 4.9, reviewCount: 521, sales: 2341 },
  { slug: 'globoplay-mensal', name: 'Globoplay Padrão', platform: 'Globoplay', platformColor: '#ff4d00', category: 'Filmes e séries', shortDesc: 'Novelas, séries e esportes · 3 telas', description: 'Globoplay completo.', price: 29.90, period: '/mês', delivery: 'auto', stock: 42, rating: 4.5, reviewCount: 178, sales: 512 },
  { slug: 'paramount-mensal', name: 'Paramount+ Mensal', platform: 'Paramount+', platformColor: '#0064ff', category: 'Filmes e séries', shortDesc: 'Filmes, séries e esportes ao vivo', description: 'Paramount+ completo.', price: 19.90, period: '/mês', delivery: 'manual', stock: 9, rating: 4.4, reviewCount: 89, sales: 234 },
  { slug: 'appletv-mensal', name: 'Apple TV+ Mensal', platform: 'Apple TV+', platformColor: '#1a1a1a', category: 'Filmes e séries', shortDesc: 'Originais Apple em 4K HDR', description: 'Apple TV+.', price: 29.90, period: '/mês', delivery: 'auto', stock: 25, rating: 4.6, reviewCount: 112, sales: 341 },
  { slug: 'star-combo-anual', name: 'Star+ Combo Anual', platform: 'Star+', platformColor: '#ff6600', category: 'Combos', shortDesc: 'Star+ e Disney+ juntos por 12 meses', description: 'Combo anual.', price: 359.90, oldPrice: 479.90, period: '/ano', delivery: 'manual', stock: 14, rating: 4.7, reviewCount: 201, sales: 445 },
  { slug: 'deezer-premium', name: 'Deezer Premium', platform: 'Deezer', platformColor: '#a238ff', category: 'Música', shortDesc: 'Música sem anúncio · 1 conta', description: 'Deezer Premium.', price: 20.90, period: '/mês', delivery: 'auto', stock: 38, rating: 4.5, reviewCount: 67, sales: 189 },
  { slug: 'combo-netflix-spotify', name: 'Combo Netflix + Spotify', platform: 'Combo', platformColor: '#7a1f3d', category: 'Combos', shortDesc: 'Netflix Premium 4K + Spotify Individual', description: 'Combo mensal.', price: 69.90, oldPrice: 79.80, period: '/mês', delivery: 'auto', stock: 22, rating: 4.9, reviewCount: 78, sales: 234 },
];

// ============================================================
// PRODUTOS
// ============================================================

async function seedProducts() {
  console.log('🌱 Populando catálogo...');
  for (const p of PRODUCTS) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: p,
      create: p,
    });
  }
  console.log(`✅ ${PRODUCTS.length} produtos inseridos/atualizados`);
}

// ============================================================
// ADMIN + CONTEÚDO INSTITUCIONAL
// ============================================================

async function seedAdmin() {
  const ADMIN_EMAIL = 'karikwia@gmail.com';
  const ADMIN_PASSWORD = 'joao231099M';

  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) {
    console.log('👤 Admin já existe, atualizando para role=admin...');
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: 'admin', emailVerified: true, status: 'ativa' },
    });
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await prisma.user.create({
    data: {
      name: 'Administrador',
      email: ADMIN_EMAIL,
      cpf: '12345678909', // CPF de teste válido
      phone: null,
      passwordHash,
      emailVerified: true,
      role: 'admin',
      status: 'ativa',
      wallet: { create: {} },
      settings: { create: {} },
    },
  });
  console.log('✅ Admin criado:', ADMIN_EMAIL);
}

async function seedSiteContent() {
  const defaults = [
    { key: 'brand.name',       value: 'STREAMLY',                                       type: 'text' },
    { key: 'brand.tagline',    value: 'Sua loja de telas de streaming',                 type: 'text' },
    { key: 'about.title',      value: 'Sobre nós',                                      type: 'text' },
    { key: 'about.content',    value: 'A STREAMLY é uma loja digital brasileira especializada em telas e assinaturas de serviços de streaming. Fundada em 2024, nossa missão é tornar o acesso ao entretenimento simples, rápido e acessível para todos.\n\nTrabalhamos com as principais plataformas do mercado — Netflix, Disney+, Prime Video, Max, Spotify, Globoplay e muito mais. Todos os produtos são entregues com agilidade e suporte dedicado.', type: 'html' },
    { key: 'privacy.title',    value: 'Política de Privacidade',                        type: 'text' },
    { key: 'privacy.content',  value: 'A STREAMLY respeita sua privacidade. Coletamos apenas os dados necessários para a prestação dos serviços: nome, e-mail, CPF, telefone e endereço, quando aplicável.\n\nSeus dados não são vendidos nem compartilhados com terceiros fora do necessário para operação (Mercado Pago para pagamentos, provedor de e-mail para comunicações).\n\nVocê pode solicitar a exclusão dos seus dados a qualquer momento em Configurações → Privacidade.', type: 'html' },
    { key: 'terms.title',      value: 'Termos de Uso',                                  type: 'text' },
    { key: 'terms.content',    value: 'Ao usar a STREAMLY, você concorda em fornecer informações verdadeiras e manter suas credenciais seguras. As telas são de uso pessoal e não podem ser revendidas.\n\nReembolsos seguem a política de 7 dias para produtos não utilizados. O CPF é vinculado permanentemente à conta por questões de segurança e prevenção a fraudes.', type: 'html' },
    { key: 'contact.email',    value: 'suporte@streamly.com.br',                        type: 'text' },
    { key: 'contact.whatsapp', value: '(11) 99999-0000',                                type: 'text' },
    { key: 'contact.hours',    value: 'Seg–Sex · 9h às 18h',                            type: 'text' },
    { key: 'address.street',   value: 'Avenida Paulista',                               type: 'text' },
    { key: 'address.number',   value: '1000',                                           type: 'text' },
    { key: 'address.complement', value: 'Sala 1502',                                    type: 'text' },
    { key: 'address.neighborhood', value: 'Bela Vista',                                 type: 'text' },
    { key: 'address.city',     value: 'São Paulo',                                      type: 'text' },
    { key: 'address.state',    value: 'SP',                                             type: 'text' },
    { key: 'address.cep',      value: '01310-100',                                      type: 'text' },
    { key: 'address.country',  value: 'Brasil',                                         type: 'text' },
    { key: 'footer.copyright', value: '© 2025 STREAMLY · Todos os direitos reservados', type: 'text' },
    { key: 'footer.cnpj',      value: '00.000.000/0001-00',                             type: 'text' },
  ];

  for (const d of defaults) {
    await prisma.siteContent.upsert({
      where: { key: d.key },
      update: {},
      create: d,
    });
  }
  console.log(`✅ ${defaults.length} entradas de conteúdo do site inseridas`);
}

async function seedRechargeConfig() {
  await prisma.rechargeConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      minAmount: 10,
      maxAmount: 5000,
      packages: [
        { value: 20,  bonus: 0 },
        { value: 50,  bonus: 2 },
        { value: 100, bonus: 5 },
        { value: 150, bonus: 8 },
        { value: 200, bonus: 12 },
        { value: 300, bonus: 20 },
      ],
      bonusTiers: [
        { min: 20,  max: 49.99, bonus: 0 },
        { min: 50,  max: 99.99, bonus: 2 },
        { min: 100, max: 149.99, bonus: 5 },
        { min: 150, max: 199.99, bonus: 8 },
        { min: 200, max: 299.99, bonus: 12 },
        { min: 300, max: 5000,   bonus: 20 },
      ],
    },
  });
  console.log('✅ Configuração de recarga criada');
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  await seedProducts();
  await seedAdmin();
  await seedSiteContent();
  await seedRechargeConfig();
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
