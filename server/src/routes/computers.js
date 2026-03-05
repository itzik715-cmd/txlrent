const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { z } = require('zod');
const QRCode = require('qrcode');

const router = express.Router();
const prisma = new PrismaClient();

const computerSchema = z.object({
  internalId: z.string().min(1, 'נדרש מזהה פנימי'),
  model: z.string().min(1, 'נדרש דגם'),
  brand: z.string().min(1, 'נדרש מותג'),
  serial: z.string().min(1, 'נדרש מספר סריאלי'),
  specs: z.any().optional(),
  status: z.enum(['AVAILABLE', 'RENTED', 'MAINTENANCE', 'LOST']).optional(),
  priceMonthly: z.number().positive('מחיר חודשי חייב להיות חיובי'),
  notes: z.string().optional().nullable(),
});

// GET /api/computers — list with filters, paginated
router.get('/', async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { internalId: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { serial: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [computers, total] = await Promise.all([
      prisma.computer.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { internalId: 'asc' },
        include: {
          rentals: {
            where: { status: 'ACTIVE' },
            include: { client: true },
            take: 1,
          },
        },
      }),
      prisma.computer.count({ where }),
    ]);

    res.json(computers);
  } catch (err) {
    next(err);
  }
});

// POST /api/computers — create
router.post('/', async (req, res, next) => {
  try {
    const parsed = computerSchema.parse(req.body);
    const computer = await prisma.computer.create({ data: parsed });
    res.status(201).json(computer);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'נתונים לא תקינים', details: err.errors });
    }
    next(err);
  }
});

// GET /api/computers/scan/:serial — find by serial (for QR)
router.get('/scan/:serial', async (req, res, next) => {
  try {
    const computer = await prisma.computer.findUnique({
      where: { serial: req.params.serial },
      include: {
        rentals: {
          orderBy: { createdAt: 'desc' },
          include: { client: true },
        },
      },
    });
    if (!computer) return res.status(404).json({ error: 'מחשב לא נמצא' });
    res.json(computer);
  } catch (err) {
    next(err);
  }
});

// GET /api/computers/:id — full details with rental history
router.get('/:id', async (req, res, next) => {
  try {
    const computer = await prisma.computer.findUnique({
      where: { id: req.params.id },
      include: {
        rentals: {
          orderBy: { createdAt: 'desc' },
          include: { client: true, billingCycles: true },
        },
      },
    });
    if (!computer) return res.status(404).json({ error: 'מחשב לא נמצא' });
    res.json(computer);
  } catch (err) {
    next(err);
  }
});

// PUT /api/computers/:id — update
router.put('/:id', async (req, res, next) => {
  try {
    const parsed = computerSchema.partial().parse(req.body);
    const computer = await prisma.computer.update({
      where: { id: req.params.id },
      data: parsed,
    });
    res.json(computer);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'נתונים לא תקינים', details: err.errors });
    }
    next(err);
  }
});

// POST /api/computers/:id/generate-qr — generate QR code
router.post('/:id/generate-qr', async (req, res, next) => {
  try {
    const computer = await prisma.computer.findUnique({ where: { id: req.params.id } });
    if (!computer) return res.status(404).json({ error: 'מחשב לא נמצא' });

    const qrData = JSON.stringify({
      id: computer.id,
      internalId: computer.internalId,
      serial: computer.serial,
    });

    const qrCode = await QRCode.toDataURL(qrData);

    const updated = await prisma.computer.update({
      where: { id: req.params.id },
      data: { qrCode },
    });

    res.json({ qrCode: updated.qrCode });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
