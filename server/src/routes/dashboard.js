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
        amount: b.amount,
        daysOverdue: Math.floor((Date.now() - new Date(b.dueDate)) / (1000 * 60 * 60 * 24)),
        clientId: b.rental.clientId,
      })),
      recentActivity,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
