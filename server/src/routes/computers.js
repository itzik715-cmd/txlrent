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
  status: z.enum(['AVAILABLE', 'RENTED', 'MAINTENANCE', 'LOST', 'SOLD', 'ARCHIVED']).optional(),
  priceMonthly: z.number().optional().default(0),
  tier: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// GET /api/computers — list with filters, paginated
// By default excludes SOLD and ARCHIVED. Use ?archive=true to see them.
router.get('/', async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 500, archive } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (archive === 'true') {
      // Show only archived/sold
      where.status = { in: ['SOLD', 'ARCHIVED'] };
    } else if (status) {
      where.status = status;
    } else {
      // Default: exclude sold and archived
      where.status = { notIn: ['SOLD', 'ARCHIVED'] };
    }

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
        issues: {
          orderBy: { createdAt: 'desc' },
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

// PUT /api/computers/:id/archive — move to archive
router.put('/:id/archive', async (req, res, next) => {
  try {
    const computer = await prisma.computer.findUnique({ where: { id: req.params.id } });
    if (!computer) return res.status(404).json({ error: 'מחשב לא נמצא' });
    if (computer.status === 'RENTED') {
      return res.status(400).json({ error: 'לא ניתן לארכב מחשב מושכר. יש להחזיר קודם' });
    }
    const updated = await prisma.computer.update({
      where: { id: req.params.id },
      data: { status: 'ARCHIVED' },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// PUT /api/computers/:id/sell — mark as sold
router.put('/:id/sell', async (req, res, next) => {
  try {
    const computer = await prisma.computer.findUnique({ where: { id: req.params.id } });
    if (!computer) return res.status(404).json({ error: 'מחשב לא נמצא' });
    if (computer.status === 'RENTED') {
      return res.status(400).json({ error: 'לא ניתן למכור מחשב מושכר. יש להחזיר קודם' });
    }
    const updated = await prisma.computer.update({
      where: { id: req.params.id },
      data: { status: 'SOLD', notes: req.body.notes || computer.notes },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// PUT /api/computers/:id/restore — restore from archive/sold back to available
router.put('/:id/restore', async (req, res, next) => {
  try {
    const computer = await prisma.computer.findUnique({ where: { id: req.params.id } });
    if (!computer) return res.status(404).json({ error: 'מחשב לא נמצא' });
    if (computer.status !== 'ARCHIVED' && computer.status !== 'SOLD') {
      return res.status(400).json({ error: 'ניתן לשחזר רק מחשבים מאורכבים או שנמכרו' });
    }
    const updated = await prisma.computer.update({
      where: { id: req.params.id },
      data: { status: 'AVAILABLE' },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// POST /api/computers/:id/clone — clone computer N times
router.post('/:id/clone', async (req, res, next) => {
  try {
    const computer = await prisma.computer.findUnique({ where: { id: req.params.id } });
    if (!computer) return res.status(404).json({ error: 'מחשב לא נמצא' });

    const count = parseInt(req.body.count) || 1;
    if (count < 1 || count > 100) {
      return res.status(400).json({ error: 'מספר העתקים חייב להיות בין 1 ל-100' });
    }

    // Extract prefix and number from internalId (e.g., "TXL3881" -> prefix="TXL", num=3881)
    const match = computer.internalId.match(/^([A-Za-z\u0590-\u05FF-]*)(\d+)$/);
    let prefix, startNum;
    if (match) {
      prefix = match[1];
      startNum = parseInt(match[2]);
    } else {
      prefix = computer.internalId + '-';
      startNum = 0;
    }

    // Find the highest existing number with this prefix
    const existing = await prisma.computer.findMany({
      where: { internalId: { startsWith: prefix } },
      select: { internalId: true },
    });

    let maxNum = startNum;
    for (const c of existing) {
      const m = c.internalId.match(/^([A-Za-z\u0590-\u05FF-]*)(\d+)$/);
      if (m && m[1] === prefix) {
        const n = parseInt(m[2]);
        if (n > maxNum) maxNum = n;
      }
    }

    // Also find highest serial suffix
    const existingSerials = await prisma.computer.findMany({
      where: { serial: { startsWith: computer.serial.replace(/-CLONE-\d+$/, '') } },
      select: { serial: true },
    });

    let maxSerial = 0;
    const baseSerial = computer.serial.replace(/-CLONE-\d+$/, '');
    for (const c of existingSerials) {
      const sm = c.serial.match(/-CLONE-(\d+)$/);
      if (sm) {
        const n = parseInt(sm[1]);
        if (n > maxSerial) maxSerial = n;
      }
    }

    const created = [];
    for (let i = 1; i <= count; i++) {
      const newInternalId = prefix + (maxNum + i);
      const newSerial = baseSerial + '-CLONE-' + (maxSerial + i);

      const clone = await prisma.computer.create({
        data: {
          internalId: newInternalId,
          model: computer.model,
          brand: computer.brand,
          serial: newSerial,
          specs: computer.specs,
          status: 'AVAILABLE',
          priceMonthly: computer.priceMonthly,
          tier: computer.tier,
          notes: computer.notes,
        },
      });
      created.push(clone);
    }

    res.status(201).json({ count: created.length, computers: created });
  } catch (err) {
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
