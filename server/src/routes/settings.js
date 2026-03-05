const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/settings — get all settings
router.get('/', async (req, res, next) => {
  try {
    const settings = await prisma.setting.findMany();
    const map = {};
    for (const s of settings) map[s.key] = s.value;
    res.json(map);
  } catch (err) {
    next(err);
  }
});

// PUT /api/settings — bulk update settings
router.put('/', async (req, res, next) => {
  try {
    const entries = Object.entries(req.body);
    for (const [key, value] of entries) {
      await prisma.setting.upsert({
        where: { key },
        create: { key, value: String(value) },
        update: { value: String(value) },
      });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
