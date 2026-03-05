const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/dashboard/summary
router.get('/summary', async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    // Stats — exclude SOLD and ARCHIVED from counts
    const [available, rented, maintenance, total] = await Promise.all([
      prisma.computer.count({ where: { status: 'AVAILABLE' } }),
      prisma.computer.count({ where: { status: 'RENTED' } }),
      prisma.computer.count({ where: { status: 'MAINTENANCE' } }),
      prisma.computer.count({ where: { status: { notIn: ['SOLD', 'ARCHIVED'] } } }),
    ]);

    // Monthly revenue (sum of priceMonthly from active rentals)
    const activeRentals = await prisma.rental.findMany({
      where: { status: 'ACTIVE' },
      select: { priceMonthly: true },
    });
    const monthlyRevenue = activeRentals.reduce((sum, r) => sum + r.priceMonthly, 0);

    // Today's returns
    const todayReturns = await prisma.rental.findMany({
      where: {
        status: 'ACTIVE',
        expectedReturn: { gte: today, lt: tomorrow },
      },
      include: { computer: true, client: true },
    });

    // Week returns
    const weekReturns = await prisma.rental.findMany({
      where: {
        status: 'ACTIVE',
        expectedReturn: { gte: today, lt: weekFromNow },
      },
      include: { computer: true, client: true },
      orderBy: { expectedReturn: 'asc' },
    });

    // Open debts
    const openDebts = await prisma.billingCycle.findMany({
      where: { status: { in: ['PENDING', 'OVERDUE'] } },
      orderBy: { dueDate: 'asc' },
      include: {
        rental: { include: { client: true, computer: true } },
      },
      take: 50,
    });

    // Client responses (answered but not yet handled)
    const clientResponses = await prisma.rentalResponse.findMany({
      where: { answered: true, handled: false },
      orderBy: { answeredAt: 'desc' },
      take: 20,
      include: {
        rental: { include: { client: true, computer: true } },
      },
    });

    // Pending alerts — deduplicate by rental (show only latest per rental)
    const allPendingAlerts = await prisma.rentalResponse.findMany({
      where: { answered: false },
      orderBy: { createdAt: 'desc' },
      include: {
        rental: { include: { client: true, computer: true } },
      },
    });
    const seenRentals = new Set();
    const pendingAlerts = allPendingAlerts.filter(r => {
      if (seenRentals.has(r.rentalId)) return false;
      seenRentals.add(r.rentalId);
      return true;
    }).slice(0, 20);

    // Pending return follow-ups
    const pendingReturns = await prisma.returnFollowup.findMany({
      where: { status: 'PENDING' },
      orderBy: { expectedDate: 'asc' },
      include: {
        rental: { include: { client: true, computer: true } },
      },
    });

    // Recent activity (last 10 rentals + last 10 payments, merged)
    const [recentRentals, recentPayments] = await Promise.all([
      prisma.rental.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { computer: true, client: true },
      }),
      prisma.payment.findMany({
        orderBy: { date: 'desc' },
        take: 10,
        include: { client: true },
      }),
    ]);

    const recentActivity = [
      ...recentRentals.map((r) => ({ type: 'rental', date: r.createdAt, data: r })),
      ...recentPayments.map((p) => ({ type: 'payment', date: p.date, data: p })),
    ]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);

    res.json({
      available,
      rented,
      maintenance,
      total,
      monthlyRevenue,
      todayReturns: todayReturns.map(r => ({
        clientName: r.client.name,
        computerInternalId: r.computer.internalId,
        computerId: r.computerId,
        status: r.status,
        expectedReturn: r.expectedReturn,
      })),
      weekReturns: weekReturns.map(r => ({
        clientName: r.client.name,
        computerInternalId: r.computer.internalId,
        computerId: r.computerId,
        status: r.status,
        expectedReturn: r.expectedReturn,
      })),
      openDebts: openDebts.map(b => ({
        clientName: b.rental.client.name,
        clientPhone: b.rental.client.phone,
        clientEmail: b.rental.client.email,
        amount: b.amount,
        dueDate: b.dueDate,
        daysOverdue: Math.floor((Date.now() - new Date(b.dueDate)) / (1000 * 60 * 60 * 24)),
        clientId: b.rental.clientId,
        computerInternalId: b.rental.computer.internalId,
      })),
      recentActivity,
      clientResponses: clientResponses.map(r => ({
        id: r.id,
        choice: r.choice,
        answeredAt: r.answeredAt,
        createdAt: r.createdAt,
        clientName: r.rental.client.name,
        clientPhone: r.rental.client.phone,
        clientEmail: r.rental.client.email,
        clientId: r.rental.clientId,
        computerInternalId: r.rental.computer.internalId,
        computerName: `${r.rental.computer.brand} ${r.rental.computer.model}`,
        rentalId: r.rentalId,
      })),
      pendingAlerts: pendingAlerts.map(r => ({
        id: r.id,
        createdAt: r.createdAt,
        clientName: r.rental.client.name,
        clientPhone: r.rental.client.phone,
        clientId: r.rental.clientId,
        computerInternalId: r.rental.computer.internalId,
        rentalId: r.rentalId,
      })),
      pendingReturns: pendingReturns.map(f => ({
        id: f.id,
        returnType: f.returnType,
        expectedDate: f.expectedDate,
        createdAt: f.createdAt,
        clientName: f.rental.client.name,
        clientPhone: f.rental.client.phone,
        computerInternalId: f.rental.computer.internalId,
        computerId: f.rental.computerId,
        rentalId: f.rentalId,
        daysLeft: f.expectedDate ? Math.ceil((new Date(f.expectedDate) - new Date()) / (1000 * 60 * 60 * 24)) : null,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/dashboard/responses/:id/handle — mark response as handled
// For renewals: optionally update rental expectedReturn and recurring
router.patch('/responses/:id/handle', async (req, res, next) => {
  try {
    const { newExpectedReturn, recurring } = req.body || {};

    const response = await prisma.rentalResponse.findUnique({
      where: { id: req.params.id },
      include: { rental: true },
    });
    if (!response) return res.status(404).json({ error: 'תגובה לא נמצאה' });

    // If renewal with new date, update the rental
    if (response.choice === 'renew' && (newExpectedReturn || recurring)) {
      const rentalUpdate = {};
      if (recurring) {
        rentalUpdate.recurring = true;
        rentalUpdate.expectedReturn = null;
      } else if (newExpectedReturn) {
        rentalUpdate.expectedReturn = new Date(newExpectedReturn);
        rentalUpdate.recurring = false;
      }
      await prisma.rental.update({
        where: { id: response.rentalId },
        data: rentalUpdate,
      });
    }

    // If return (pickup/courier), create follow-up and update computer status
    if (response.choice === 'return_pickup' || response.choice === 'return_courier') {
      await prisma.returnFollowup.create({
        data: {
          rentalId: response.rentalId,
          returnType: response.choice,
          expectedDate: newExpectedReturn ? new Date(newExpectedReturn) : null,
        },
      });
      // Update computer to PENDING_RETURN
      await prisma.computer.update({
        where: { id: response.rental.computerId },
        data: { status: 'PENDING_RETURN' },
      });
    }

    const updated = await prisma.rentalResponse.update({
      where: { id: req.params.id },
      data: { handled: true, handledAt: new Date() },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/dashboard/followups/:id/returned — mark follow-up as returned, set computer to PENDING_CLEANING
router.patch('/followups/:id/returned', async (req, res, next) => {
  try {
    const followup = await prisma.returnFollowup.findUnique({
      where: { id: req.params.id },
      include: { rental: true },
    });
    if (!followup) return res.status(404).json({ error: 'מעקב לא נמצא' });

    await prisma.returnFollowup.update({
      where: { id: req.params.id },
      data: { status: 'RETURNED', resolvedAt: new Date() },
    });

    // Update computer status to PENDING_CLEANING
    await prisma.computer.update({
      where: { id: followup.rental.computerId },
      data: { status: 'PENDING_CLEANING' },
    });

    // Mark rental as returned
    await prisma.rental.update({
      where: { id: followup.rentalId },
      data: { status: 'RETURNED', actualReturn: new Date() },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/dashboard/followups/:id/cancel — cancel follow-up
router.patch('/followups/:id/cancel', async (req, res, next) => {
  try {
    await prisma.returnFollowup.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED', resolvedAt: new Date() },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
