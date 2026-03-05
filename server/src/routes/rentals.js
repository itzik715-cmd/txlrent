const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/rentals — list with filter
router.get('/', async (req, res, next) => {
  try {
    const { status, page = 1, limit = 500 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) {
      where.status = status.toUpperCase();
    }

    const [rentals, total] = await Promise.all([
      prisma.rental.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: { computer: true, client: true, billingCycles: true },
      }),
      prisma.rental.count({ where }),
    ]);

    const mapped = rentals.map(r => ({
      ...r,
      computerInternalId: r.computer?.internalId,
      clientName: r.client?.name,
    }));
    res.json(mapped);
  } catch (err) {
    next(err);
  }
});

// GET /api/rentals/returns-today
router.get('/returns-today', async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const rentals = await prisma.rental.findMany({
      where: {
        status: 'ACTIVE',
        expectedReturn: { gte: today, lt: tomorrow },
      },
      include: { computer: true, client: true },
    });

    res.json(rentals);
  } catch (err) {
    next(err);
  }
});

// GET /api/rentals/returns-week
router.get('/returns-week', async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    const rentals = await prisma.rental.findMany({
      where: {
        status: 'ACTIVE',
        expectedReturn: { gte: today, lt: weekFromNow },
      },
      include: { computer: true, client: true },
      orderBy: { expectedReturn: 'asc' },
    });

    res.json(rentals);
  } catch (err) {
    next(err);
  }
});

// POST /api/rentals — create rental
router.post('/', async (req, res, next) => {
  try {
    const { computerId, clientId, startDate, expectedReturn, priceMonthly, notes } = req.body;

    if (!computerId || !clientId || !startDate || !expectedReturn || !priceMonthly) {
      return res.status(400).json({ error: 'חסרים שדות חובה' });
    }

    // Check computer is available
    const computer = await prisma.computer.findUnique({ where: { id: computerId } });
    if (!computer) return res.status(404).json({ error: 'מחשב לא נמצא' });
    if (computer.status !== 'AVAILABLE') {
      return res.status(400).json({ error: 'המחשב אינו זמין להשכרה' });
    }

    const rental = await prisma.$transaction(async (tx) => {
      // Create rental
      const newRental = await tx.rental.create({
        data: {
          computerId,
          clientId,
          startDate: new Date(startDate),
          expectedReturn: new Date(expectedReturn),
          priceMonthly: parseFloat(priceMonthly),
          notes,
        },
      });

      // Set computer to RENTED
      await tx.computer.update({
        where: { id: computerId },
        data: { status: 'RENTED' },
      });

      // Create first billing cycle
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + 1);
      await tx.billingCycle.create({
        data: {
          rentalId: newRental.id,
          amount: parseFloat(priceMonthly),
          dueDate,
        },
      });

      return newRental;
    });

    const full = await prisma.rental.findUnique({
      where: { id: rental.id },
      include: { computer: true, client: true, billingCycles: true },
    });

    res.status(201).json(full);
  } catch (err) {
    next(err);
  }
});

// POST /api/rentals/bulk — create multiple rentals for one client
router.post('/bulk', async (req, res, next) => {
  try {
    const { computerIds, clientId, startDate, expectedReturn, priceMonthly, notes } = req.body;

    if (!computerIds || !Array.isArray(computerIds) || computerIds.length === 0) {
      return res.status(400).json({ error: 'יש לבחור לפחות מחשב אחד' });
    }
    if (!clientId || !startDate || !expectedReturn || !priceMonthly) {
      return res.status(400).json({ error: 'חסרים שדות חובה' });
    }

    // Verify all computers are available
    const computers = await prisma.computer.findMany({
      where: { id: { in: computerIds } },
    });

    if (computers.length !== computerIds.length) {
      return res.status(400).json({ error: 'חלק מהמחשבים לא נמצאו' });
    }

    const unavailable = computers.filter(c => c.status !== 'AVAILABLE');
    if (unavailable.length > 0) {
      return res.status(400).json({
        error: `המחשבים הבאים אינם זמינים: ${unavailable.map(c => c.internalId).join(', ')}`,
      });
    }

    const rentals = await prisma.$transaction(async (tx) => {
      const created = [];
      for (const compId of computerIds) {
        const rental = await tx.rental.create({
          data: {
            computerId: compId,
            clientId,
            startDate: new Date(startDate),
            expectedReturn: new Date(expectedReturn),
            priceMonthly: parseFloat(priceMonthly),
            notes,
          },
        });

        await tx.computer.update({
          where: { id: compId },
          data: { status: 'RENTED' },
        });

        // Create first billing cycle
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + 1);
        await tx.billingCycle.create({
          data: {
            rentalId: rental.id,
            amount: parseFloat(priceMonthly),
            dueDate,
          },
        });

        created.push(rental);
      }
      return created;
    });

    res.status(201).json({ count: rentals.length, rentals });
  } catch (err) {
    next(err);
  }
});

// PUT /api/rentals/:id/return — close rental
router.put('/:id/return', async (req, res, next) => {
  try {
    const rental = await prisma.rental.findUnique({ where: { id: req.params.id } });
    if (!rental) return res.status(404).json({ error: 'השכרה לא נמצאה' });
    if (rental.status === 'RETURNED') {
      return res.status(400).json({ error: 'ההשכרה כבר הוחזרה' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedRental = await tx.rental.update({
        where: { id: req.params.id },
        data: {
          status: 'RETURNED',
          actualReturn: new Date(),
        },
      });

      await tx.computer.update({
        where: { id: rental.computerId },
        data: { status: 'AVAILABLE' },
      });

      return updatedRental;
    });

    const full = await prisma.rental.findUnique({
      where: { id: updated.id },
      include: { computer: true, client: true, billingCycles: true },
    });

    res.json(full);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
