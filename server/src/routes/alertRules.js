const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/alert-rules
router.get('/', async (req, res, next) => {
  try {
    const rules = await prisma.alertRule.findMany({ orderBy: { dayOffset: 'asc' } });
    res.json(rules);
  } catch (err) {
    next(err);
  }
});

// POST /api/alert-rules
router.post('/', async (req, res, next) => {
  try {
    const { name, trigger, dayOffset, template, enabled } = req.body;
    if (!name || !trigger || dayOffset === undefined || !template) {
      return res.status(400).json({ error: 'חסרים שדות חובה' });
    }
    const rule = await prisma.alertRule.create({
      data: {
        name,
        trigger,
        dayOffset: parseInt(dayOffset),
        template,
        enabled: enabled !== false,
      },
    });
    res.status(201).json(rule);
  } catch (err) {
    next(err);
  }
});

// PUT /api/alert-rules/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { name, trigger, dayOffset, template, enabled } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (trigger !== undefined) data.trigger = trigger;
    if (dayOffset !== undefined) data.dayOffset = parseInt(dayOffset);
    if (template !== undefined) data.template = template;
    if (enabled !== undefined) data.enabled = enabled;

    const rule = await prisma.alertRule.update({
      where: { id: req.params.id },
      data,
    });
    res.json(rule);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/alert-rules/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.alertRule.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
