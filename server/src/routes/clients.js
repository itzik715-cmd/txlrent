const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/clients — list all clients with outstanding balance
router.get('/', async (req, res, next) => {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { name: 'asc' },
      include: {
        rentals: {
          include: {
            billingCycles: {
              where: { status: { in: ['PENDING', 'OVERDUE'] } },
            },
          },
        },
      },
    });

    const result = clients.map((client) => {
      const outstandingBalance = client.rentals.reduce((sum, rental) => {
        return sum + rental.billingCycles.reduce((s, bc) => s + bc.amount, 0);
      }, 0);
      const { rentals, ...clientData } = client;
      return { ...clientData, outstandingBalance, activeRentals: rentals.filter(r => r.status === 'ACTIVE').length };
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/clients — create
router.post('/', async (req, res, next) => {
  try {
    const { name, contactName, phone, email, address, notes } = req.body;
    if (!name || !contactName || !phone) {
      return res.status(400).json({ error: 'נדרש שם, איש קשר וטלפון' });
    }
    const client = await prisma.client.create({
      data: { name, contactName, phone, email, address, notes },
    });
    res.status(201).json(client);
  } catch (err) {
    next(err);
  }
});

// GET /api/clients/:id — full profile
router.get('/:id', async (req, res, next) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: {
        rentals: {
          orderBy: { createdAt: 'desc' },
          include: { computer: true, billingCycles: true },
        },
        payments: { orderBy: { date: 'desc' } },
      },
    });
    if (!client) return res.status(404).json({ error: 'לקוח לא נמצא' });
    res.json(client);
  } catch (err) {
    next(err);
  }
});

// PUT /api/clients/:id — update
router.put('/:id', async (req, res, next) => {
  try {
    const { name, contactName, phone, email, address, notes } = req.body;
    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: { name, contactName, phone, email, address, notes },
    });
    res.json(client);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
