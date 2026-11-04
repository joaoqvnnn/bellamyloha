require('dotenv').config();
const prisma = require('../src/lib/prisma');

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

async function main() {
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

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
