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

    res.json({
      id: response.id,
      answered: response.answered,
      choice: response.choice,
      client: response.rental.client.name,
      computer: `${response.rental.computer.brand} ${response.rental.computer.model}`,
      computerId: response.rental.computer.internalId,
      expectedReturn: response.rental.expectedReturn,
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

module.exports = router;
