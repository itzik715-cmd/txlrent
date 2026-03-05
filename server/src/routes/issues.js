const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/issues?computerId=xxx — list issues for a computer
router.get('/', async (req, res, next) => {
  try {
    const { computerId } = req.query;
    if (!computerId) return res.status(400).json({ error: 'חסר מזהה מחשב' });

    const issues = await prisma.issue.findMany({
      where: { computerId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(issues);
  } catch (err) {
    next(err);
  }
});

// POST /api/issues — create issue
router.post('/', async (req, res, next) => {
  try {
    const { computerId, description } = req.body;
    if (!computerId || !description) {
      return res.status(400).json({ error: 'חסרים שדות חובה' });
    }

    const issue = await prisma.issue.create({
      data: { computerId, description },
    });
    res.status(201).json(issue);
  } catch (err) {
    next(err);
  }
});

// PUT /api/issues/:id — update (resolve / edit)
router.put('/:id', async (req, res, next) => {
  try {
    const { description, resolution, status } = req.body;
    const data = {};
    if (description !== undefined) data.description = description;
    if (resolution !== undefined) data.resolution = resolution;
    if (status === 'RESOLVED') {
      data.status = 'RESOLVED';
      data.resolvedAt = new Date();
    } else if (status === 'OPEN') {
      data.status = 'OPEN';
      data.resolvedAt = null;
    }

    const issue = await prisma.issue.update({
      where: { id: req.params.id },
      data,
    });
    res.json(issue);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/issues/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.issue.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
