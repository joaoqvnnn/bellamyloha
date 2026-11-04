const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    let s = await prisma.userSettings.findUnique({ where: { userId: req.user.id } });
    if (!s) s = await prisma.userSettings.create({ data: { userId: req.user.id } });
    res.json({
      appearance: s.appearance,
      region: s.region,
      notifications: s.notifications,
      privacy: s.privacy,
      security: s.security,
      store: s.store,
    });
  } catch (err) { next(err); }
});

router.put('/', requireAuth, async (req, res, next) => {
  try {
    const { appearance, region, notifications, privacy, security, store } = req.body || {};
    const data = {};
    if (appearance    !== undefined) data.appearance = appearance;
    if (region        !== undefined) data.region = region;
    if (notifications !== undefined) data.notifications = notifications;
    if (privacy       !== undefined) data.privacy = privacy;
    if (security      !== undefined) data.security = security;
    if (store         !== undefined) data.store = store;

    const saved = await prisma.userSettings.upsert({
      where: { userId: req.user.id },
      create: { userId: req.user.id, ...data },
      update: data,
    });
    res.json({ ok: true, settings: saved });
  } catch (err) { next(err); }
});

module.exports = router;
