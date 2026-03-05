const express = require('express');
const bcrypt = require('bcrypt');
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

// ─── User Management ───

// GET /api/settings/users
router.get('/users', async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, mfaEnabled: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
});

// POST /api/settings/users — create user
router.post('/users', async (req, res, next) => {
  try {
    const { email, password, name, role } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'חסרים שדות חובה' });
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'אימייל כבר קיים במערכת' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashed, name, role: role || 'user' },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// PUT /api/settings/users/:id — update user
router.put('/users/:id', async (req, res, next) => {
  try {
    const { email, password, name, role } = req.body;
    const data = {};
    if (email) data.email = email;
    if (name) data.name = name;
    if (role) data.role = role;
    if (password) data.password = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/settings/users/:id — delete user
router.delete('/users/:id', async (req, res, next) => {
  try {
    const count = await prisma.user.count();
    if (count <= 1) {
      return res.status(400).json({ error: 'לא ניתן למחוק את המשתמש האחרון' });
    }
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// PUT /api/settings/users/:id/mfa-reset — admin force disable MFA
router.put('/users/:id/mfa-reset', async (req, res, next) => {
  try {
    await prisma.user.update({
      where: { id: req.params.id },
      data: { mfaEnabled: false, mfaSecret: null },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
