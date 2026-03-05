const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { sendWhatsApp, sendEmail } = require('../services/notifications');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/billing (also /api/billings) — all billing cycles with flat fields
router.get('/', async (req, res, next) => {
  try {
    const cycles = await prisma.billingCycle.findMany({
      orderBy: { dueDate: 'desc' },
      include: {
        rental: {
          include: {
            client: true,
            computer: true,
          },
        },
      },
    });

    const mapped = cycles.map(c => ({
      id: c.id,
      clientName: c.rental?.client?.name,
      computerInternalId: c.rental?.computer?.internalId,
      amount: c.amount,
      date: c.dueDate,
      status: c.status,
      clientId: c.rental?.clientId,
    }));

    res.json(mapped);
  } catch (err) {
    next(err);
  }
});

// GET /api/billing/open — all PENDING or OVERDUE billing cycles
router.get('/open', async (req, res, next) => {
  try {
    const cycles = await prisma.billingCycle.findMany({
      where: { status: { in: ['PENDING', 'OVERDUE'] } },
      orderBy: { dueDate: 'asc' },
      include: {
        rental: {
          include: {
            client: true,
            computer: true,
          },
        },
      },
    });

    res.json(cycles);
  } catch (err) {
    next(err);
  }
});

// POST /api/billing/payment — record payment
router.post('/payment', async (req, res, next) => {
  try {
    const { clientId, amount, method, notes, billingCycleIds } = req.body;

    if (!clientId || !amount) {
      return res.status(400).json({ error: 'נדרש מזהה לקוח וסכום' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create payment record
      const payment = await tx.payment.create({
        data: {
          clientId,
          amount: parseFloat(amount),
          method,
          notes,
        },
      });

      // Mark specified billing cycles as PAID
      if (billingCycleIds && billingCycleIds.length > 0) {
        await tx.billingCycle.updateMany({
          where: { id: { in: billingCycleIds } },
          data: { status: 'PAID', paidDate: new Date() },
        });
      }

      return payment;
    });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/billing/client/:id — billing history for a client
router.get('/client/:id', async (req, res, next) => {
  try {
    const [billingCycles, payments] = await Promise.all([
      prisma.billingCycle.findMany({
        where: { rental: { clientId: req.params.id } },
        orderBy: { dueDate: 'desc' },
        include: {
          rental: { include: { computer: true } },
        },
      }),
      prisma.payment.findMany({
        where: { clientId: req.params.id },
        orderBy: { date: 'desc' },
      }),
    ]);

    res.json({ billingCycles, payments });
  } catch (err) {
    next(err);
  }
});

// POST /api/billing/remind/:clientId — send reminder
router.post('/remind/:clientId', async (req, res, next) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.clientId },
    });
    if (!client) return res.status(404).json({ error: 'לקוח לא נמצא' });

    const openCycles = await prisma.billingCycle.findMany({
      where: {
        status: { in: ['PENDING', 'OVERDUE'] },
        rental: { clientId: req.params.clientId },
      },
    });

    const totalDebt = openCycles.reduce((sum, c) => sum + c.amount, 0);
    const message = `שלום ${client.contactName}, יש לך חוב פתוח של ${totalDebt} ש"ח עבור השכרת מחשבים. נא להסדיר בהקדם. תודה, LapTrack`;

    const results = [];
    results.push(await sendWhatsApp(client.phone, message));
    if (client.email) {
      results.push(await sendEmail(client.email, 'תזכורת תשלום - LapTrack', `<p>${message}</p>`));
    }

    res.json({ message: 'תזכורת נשלחה', totalDebt, results });
  } catch (err) {
    next(err);
  }
});

// POST / — record payment (for /api/payments)
router.post('/', async (req, res, next) => {
  try {
    const { clientId, amount, method, notes, billingCycleIds } = req.body;

    if (!clientId || !amount) {
      return res.status(400).json({ error: 'נדרש מזהה לקוח וסכום' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          clientId,
          amount: parseFloat(amount),
          method,
          notes,
        },
      });

      if (billingCycleIds && billingCycleIds.length > 0) {
        await tx.billingCycle.updateMany({
          where: { id: { in: billingCycleIds } },
          data: { status: 'PAID', paidDate: new Date() },
        });
      }

      return payment;
    });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// POST /:id/remind — send reminder for a specific billing cycle
router.post('/:id/remind', async (req, res, next) => {
  try {
    const cycle = await prisma.billingCycle.findUnique({
      where: { id: req.params.id },
      include: { rental: { include: { client: true } } },
    });
    if (!cycle) return res.status(404).json({ error: 'מחזור חיוב לא נמצא' });

    const client = cycle.rental.client;
    if (!client) return res.status(404).json({ error: 'לקוח לא נמצא' });

    const openCycles = await prisma.billingCycle.findMany({
      where: {
        status: { in: ['PENDING', 'OVERDUE'] },
        rental: { clientId: client.id },
      },
    });

    const totalDebt = openCycles.reduce((sum, c) => sum + c.amount, 0);
    const message = `שלום ${client.contactName}, יש לך חוב פתוח של ${totalDebt} ש"ח עבור השכרת מחשבים. נא להסדיר בהקדם. תודה, LapTrack`;

    const results = [];
    results.push(await sendWhatsApp(client.phone, message));
    if (client.email) {
      results.push(await sendEmail(client.email, 'תזכורת תשלום - LapTrack', `<p>${message}</p>`));
    }

    res.json({ message: 'תזכורת נשלחה', totalDebt, results });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
