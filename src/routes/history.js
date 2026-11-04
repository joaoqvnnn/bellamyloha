const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { type, status, category, from, to, page = 1, perPage = 30 } = req.query;
    const where = { userId: req.user.id };
    if (type)     where.type = type;
    if (status)   where.status = status;
    if (category) where.category = category;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to)   where.createdAt.lte = new Date(to);
    }
    const skip = (Number(page) - 1) * Number(perPage);
    const [items, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(perPage),
      }),
      prisma.transaction.count({ where }),
    ]);
    res.json({ total, items });
  } catch (err) { next(err); }
});

module.exports = router;
