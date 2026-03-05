const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/reports/inventory — full computer inventory
router.get('/inventory', async (req, res, next) => {
  try {
    const computers = await prisma.computer.findMany({
      orderBy: { internalId: 'asc' },
      include: {
        rentals: {
          where: { status: 'ACTIVE' },
          include: { client: true },
          take: 1,
        },
      },
    });

    res.json(computers.map(c => ({
      id: c.id,
      internalId: c.internalId,
      brand: c.brand,
      model: c.model,
      serial: c.serial,
      status: c.status,
      tier: c.tier,
      priceMonthly: c.priceMonthly,
      specs: c.specs,
      notes: c.notes,
      createdAt: c.createdAt,
      currentClient: c.rentals[0]?.client?.name || null,
    })));
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/by-client — computers grouped by client
router.get('/by-client', async (req, res, next) => {
  try {
    const clients = await prisma.client.findMany({
      where: { archived: false },
      orderBy: { name: 'asc' },
      include: {
        rentals: {
          where: { status: 'ACTIVE' },
          include: { computer: true },
        },
      },
    });

    res.json(clients.map(cl => ({
      id: cl.id,
      name: cl.name,
      contactName: cl.contactName,
      phone: cl.phone,
      email: cl.email,
      computers: cl.rentals.map(r => ({
        internalId: r.computer.internalId,
        brand: r.computer.brand,
        model: r.computer.model,
        specs: r.computer.specs,
        priceMonthly: r.priceMonthly,
        startDate: r.startDate,
        expectedReturn: r.expectedReturn,
        recurring: r.recurring,
      })),
      totalMonthly: cl.rentals.reduce((sum, r) => sum + r.priceMonthly, 0),
      computerCount: cl.rentals.length,
    })));
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/revenue-per-computer — revenue each computer generated
router.get('/revenue-per-computer', async (req, res, next) => {
  try {
    const computers = await prisma.computer.findMany({
      orderBy: { internalId: 'asc' },
      include: {
        rentals: {
          include: {
            billingCycles: { where: { status: 'PAID' } },
          },
        },
      },
    });

    res.json(computers.map(c => {
      const totalPaid = c.rentals.reduce((sum, r) =>
        sum + r.billingCycles.reduce((s, b) => s + b.amount, 0), 0);
      const totalMonths = c.rentals.reduce((sum, r) => {
        const start = new Date(r.startDate);
        const end = r.actualReturn ? new Date(r.actualReturn) : new Date();
        const months = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24 * 30)));
        return sum + months;
      }, 0);
      const rentalCount = c.rentals.length;

      return {
        id: c.id,
        internalId: c.internalId,
        brand: c.brand,
        model: c.model,
        status: c.status,
        priceMonthly: c.priceMonthly,
        totalRevenue: totalPaid,
        totalMonthsRented: totalMonths,
        rentalCount,
      };
    }));
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/monthly-revenue — revenue breakdown by month
router.get('/monthly-revenue', async (req, res, next) => {
  try {
    const payments = await prisma.payment.findMany({
      orderBy: { date: 'asc' },
      include: { client: true },
    });

    const paidCycles = await prisma.billingCycle.findMany({
      where: { status: 'PAID', paidDate: { not: null } },
      orderBy: { paidDate: 'asc' },
    });

    // Group by month
    const monthMap = {};
    for (const p of payments) {
      const key = `${p.date.getFullYear()}-${String(p.date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap[key]) monthMap[key] = { month: key, payments: 0, billing: 0 };
      monthMap[key].payments += p.amount;
    }
    for (const b of paidCycles) {
      const d = b.paidDate;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap[key]) monthMap[key] = { month: key, payments: 0, billing: 0 };
      monthMap[key].billing += b.amount;
    }

    const months = Object.values(monthMap).sort((a, b) => b.month.localeCompare(a.month));
    res.json(months);
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/debts — clients with open debts
router.get('/debts', async (req, res, next) => {
  try {
    const openCycles = await prisma.billingCycle.findMany({
      where: { status: { in: ['PENDING', 'OVERDUE'] } },
      orderBy: { dueDate: 'asc' },
      include: {
        rental: { include: { client: true, computer: true } },
      },
    });

    // Group by client
    const clientMap = {};
    for (const b of openCycles) {
      const cid = b.rental.clientId;
      if (!clientMap[cid]) {
        clientMap[cid] = {
          clientId: cid,
          clientName: b.rental.client.name,
          clientPhone: b.rental.client.phone,
          clientEmail: b.rental.client.email,
          totalDebt: 0,
          cycles: [],
        };
      }
      clientMap[cid].totalDebt += b.amount;
      clientMap[cid].cycles.push({
        amount: b.amount,
        dueDate: b.dueDate,
        status: b.status,
        computerInternalId: b.rental.computer.internalId,
        daysOverdue: Math.floor((Date.now() - new Date(b.dueDate)) / (1000 * 60 * 60 * 24)),
      });
    }

    const result = Object.values(clientMap).sort((a, b) => b.totalDebt - a.totalDebt);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/rental-history — all rentals with filters
router.get('/rental-history', async (req, res, next) => {
  try {
    const { status, clientId, from, to } = req.query;
    const where = {};
    if (status) where.status = status;
    if (clientId) where.clientId = clientId;
    if (from || to) {
      where.startDate = {};
      if (from) where.startDate.gte = new Date(from);
      if (to) where.startDate.lte = new Date(to);
    }

    const rentals = await prisma.rental.findMany({
      where,
      orderBy: { startDate: 'desc' },
      include: { computer: true, client: true },
    });

    res.json(rentals.map(r => ({
      id: r.id,
      computerInternalId: r.computer.internalId,
      computerName: `${r.computer.brand} ${r.computer.model}`,
      clientName: r.client.name,
      clientPhone: r.client.phone,
      startDate: r.startDate,
      expectedReturn: r.expectedReturn,
      actualReturn: r.actualReturn,
      recurring: r.recurring,
      priceMonthly: r.priceMonthly,
      status: r.status,
    })));
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/by-specs — computers filtered by specs
router.get('/by-specs', async (req, res, next) => {
  try {
    const { ram, cpu, storage, status } = req.query;
    const where = {};
    if (status) where.status = status;

    const computers = await prisma.computer.findMany({
      where,
      orderBy: { internalId: 'asc' },
      include: {
        rentals: {
          where: { status: 'ACTIVE' },
          include: { client: true },
          take: 1,
        },
      },
    });

    // Filter by specs (JSON field)
    const filtered = computers.filter(c => {
      const specs = c.specs || {};
      if (ram && !String(specs.ram || '').toLowerCase().includes(ram.toLowerCase())) return false;
      if (cpu && !String(specs.cpu || '').toLowerCase().includes(cpu.toLowerCase())) return false;
      if (storage && !String(specs.storage || '').toLowerCase().includes(storage.toLowerCase())) return false;
      return true;
    });

    res.json(filtered.map(c => ({
      id: c.id,
      internalId: c.internalId,
      brand: c.brand,
      model: c.model,
      serial: c.serial,
      status: c.status,
      tier: c.tier,
      priceMonthly: c.priceMonthly,
      specs: c.specs,
      currentClient: c.rentals[0]?.client?.name || null,
    })));
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/utilization — utilization rate per computer
router.get('/utilization', async (req, res, next) => {
  try {
    const computers = await prisma.computer.findMany({
      orderBy: { internalId: 'asc' },
      include: { rentals: true },
    });

    const now = new Date();

    res.json(computers.map(c => {
      const createdAt = new Date(c.createdAt);
      const totalDays = Math.max(1, Math.floor((now - createdAt) / (1000 * 60 * 60 * 24)));

      let rentedDays = 0;
      for (const r of c.rentals) {
        const start = new Date(r.startDate);
        const end = r.actualReturn ? new Date(r.actualReturn) : (r.status === 'ACTIVE' ? now : new Date(r.startDate));
        rentedDays += Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24)));
      }

      const utilization = Math.min(100, Math.round((rentedDays / totalDays) * 100));

      return {
        id: c.id,
        internalId: c.internalId,
        brand: c.brand,
        model: c.model,
        status: c.status,
        totalDays,
        rentedDays,
        utilization,
        rentalCount: c.rentals.length,
      };
    }));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
