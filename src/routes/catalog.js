const express = require('express');
const prisma = require('../lib/prisma');
const router = express.Router();

// GET /api/catalog?category=&search=&sort=&page=&perPage=
router.get('/', async (req, res, next) => {
  try {
    const { category, search, sort = 'relevance', page = 1, perPage = 12 } = req.query;
    const where = { active: true };
    if (category && category !== 'todas') where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { platform: { contains: search, mode: 'insensitive' } },
        { shortDesc: { contains: search, mode: 'insensitive' } },
      ];
    }
    const orderBy = {
      'price-asc': { price: 'asc' },
      'price-desc': { price: 'desc' },
      'sales-desc': { sales: 'desc' },
      'rating-desc': { rating: 'desc' },
      'newest': { createdAt: 'desc' },
      'relevance': [{ sales: 'desc' }, { rating: 'desc' }],
    }[sort] || { createdAt: 'desc' };

    const skip = (Number(page) - 1) * Number(perPage);
    const [items, total] = await Promise.all([
      prisma.product.findMany({ where, orderBy, skip, take: Number(perPage) }),
      prisma.product.count({ where }),
    ]);

    res.json({
      total,
      page: Number(page),
      perPage: Number(perPage),
      items: items.map(p => ({
        id: p.slug,
        name: p.name,
        platform: p.platform,
        platformColor: p.platformColor,
        category: p.category,
        shortDesc: p.shortDesc,
        price: Number(p.price),
        oldPrice: p.oldPrice ? Number(p.oldPrice) : null,
        period: p.period,
        delivery: p.delivery,
        stock: p.stock,
        rating: p.rating,
        reviewCount: p.reviewCount,
        sales: p.sales,
      })),
    });
  } catch (err) { next(err); }
});

// GET /api/catalog/:slug
router.get('/:slug', async (req, res, next) => {
  try {
    const p = await prisma.product.findUnique({ where: { slug: req.params.slug } });
    if (!p || !p.active) return res.status(404).json({ error: 'Produto não encontrado.' });
    res.json({
      id: p.slug,
      name: p.name,
      platform: p.platform,
      platformColor: p.platformColor,
      category: p.category,
      shortDesc: p.shortDesc,
      description: p.description,
      features: p.features,
      howItWorks: p.howItWorks,
      price: Number(p.price),
      oldPrice: p.oldPrice ? Number(p.oldPrice) : null,
      period: p.period,
      delivery: p.delivery,
      stock: p.stock,
      rating: p.rating,
      reviewCount: p.reviewCount,
      sales: p.sales,
    });
  } catch (err) { next(err); }
});

module.exports = router;
