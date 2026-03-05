const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/responses/:token — get response page data (PUBLIC)
router.get('/:token', async (req, res, next) => {
  try {
    const response = await prisma.rentalResponse.findUnique({
      where: { token: req.params.token },
      include: {
        rental: {
          include: { computer: true, client: true },
        },
      },
    });

    if (!response) return res.status(404).json({ error: 'קישור לא תקין' });

    // Find sibling responses for the same client (unanswered, created within same day)
    const dayStart = new Date(response.createdAt);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const siblings = await prisma.rentalResponse.findMany({
      where: {
        id: { not: response.id },
        answered: false,
        rental: { clientId: response.rental.clientId },
        createdAt: { gte: dayStart, lt: dayEnd },
      },
      include: {
        rental: { include: { computer: true } },
      },
    });

    const siblingsList = siblings.map(s => ({
      token: s.token,
      computerId: s.rental.computer.internalId,
      computer: `${s.rental.computer.brand} ${s.rental.computer.model}`,
      expectedReturn: s.rental.expectedReturn,
    }));

    res.json({
      id: response.id,
      answered: response.answered,
      choice: response.choice,
      client: response.rental.client.name,
      computer: `${response.rental.computer.brand} ${response.rental.computer.model}`,
      computerId: response.rental.computer.internalId,
      expectedReturn: response.rental.expectedReturn,
      siblings: siblingsList,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/responses/:token — submit choice (PUBLIC)
router.post('/:token', async (req, res, next) => {
  try {
    const response = await prisma.rentalResponse.findUnique({
      where: { token: req.params.token },
    });

    if (!response) return res.status(404).json({ error: 'קישור לא תקין' });
    if (response.answered) return res.status(400).json({ error: 'כבר נבחרה אפשרות', choice: response.choice });

    const { choice } = req.body;
    if (!choice || !['renew', 'return_pickup', 'return_courier'].includes(choice)) {
      return res.status(400).json({ error: 'בחירה לא תקינה' });
    }

    const updated = await prisma.rentalResponse.update({
      where: { token: req.params.token },
      data: {
        choice,
        answered: true,
        answeredAt: new Date(),
      },
    });

    res.json({ success: true, choice: updated.choice });
  } catch (err) {
    next(err);
  }
});

// POST /api/responses/bulk — submit choice for multiple tokens (PUBLIC)
router.post('/bulk', async (req, res, next) => {
  try {
    const { tokens, choice } = req.body;
    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return res.status(400).json({ error: 'חסרים טוקנים' });
    }
    if (!choice || !['renew', 'return_pickup', 'return_courier'].includes(choice)) {
      return res.status(400).json({ error: 'בחירה לא תקינה' });
    }

    const updated = await prisma.rentalResponse.updateMany({
      where: {
        token: { in: tokens },
        answered: false,
      },
      data: {
        choice,
        answered: true,
        answeredAt: new Date(),
      },
    });

    res.json({ success: true, count: updated.count, choice });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
