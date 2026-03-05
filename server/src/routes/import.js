const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/import/excel — upload and parse Excel
router.post('/excel', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'לא הועלה קובץ' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const results = { computers: 0, clients: 0, rentals: 0, errors: [] };

    // Process Computers sheet
    if (workbook.SheetNames.includes('Computers')) {
      const data = XLSX.utils.sheet_to_json(workbook.Sheets['Computers']);
      for (const row of data) {
        try {
          await prisma.computer.upsert({
            where: { internalId: String(row['מזהה פנימי'] || row['InternalId'] || '') },
            update: {
              model: String(row['דגם'] || row['Model'] || ''),
              brand: String(row['מותג'] || row['Brand'] || ''),
              serial: String(row['סריאלי'] || row['Serial'] || ''),
              priceMonthly: parseFloat(row['מחיר חודשי'] || row['PriceMonthly'] || 0),
              notes: row['הערות'] || row['Notes'] || null,
            },
            create: {
              internalId: String(row['מזהה פנימי'] || row['InternalId'] || ''),
              model: String(row['דגם'] || row['Model'] || ''),
              brand: String(row['מותג'] || row['Brand'] || ''),
              serial: String(row['סריאלי'] || row['Serial'] || ''),
              priceMonthly: parseFloat(row['מחיר חודשי'] || row['PriceMonthly'] || 0),
              notes: row['הערות'] || row['Notes'] || null,
            },
          });
          results.computers++;
        } catch (err) {
          results.errors.push(`Computer ${row['מזהה פנימי'] || row['InternalId']}: ${err.message}`);
        }
      }
    }

    // Process Clients sheet
    if (workbook.SheetNames.includes('Clients')) {
      const data = XLSX.utils.sheet_to_json(workbook.Sheets['Clients']);
      for (const row of data) {
        try {
          const phone = String(row['טלפון'] || row['Phone'] || '');
          await prisma.client.upsert({
            where: { id: row['id'] || 'none' },
            update: {
              name: String(row['שם'] || row['Name'] || ''),
              contactName: String(row['איש קשר'] || row['ContactName'] || ''),
              phone,
              email: row['אימייל'] || row['Email'] || null,
              address: row['כתובת'] || row['Address'] || null,
            },
            create: {
              name: String(row['שם'] || row['Name'] || ''),
              contactName: String(row['איש קשר'] || row['ContactName'] || ''),
              phone,
              email: row['אימייל'] || row['Email'] || null,
              address: row['כתובת'] || row['Address'] || null,
            },
          });
          results.clients++;
        } catch (err) {
          results.errors.push(`Client ${row['שם'] || row['Name']}: ${err.message}`);
        }
      }
    }

    // Process Rentals sheet
    if (workbook.SheetNames.includes('Rentals')) {
      const data = XLSX.utils.sheet_to_json(workbook.Sheets['Rentals']);
      for (const row of data) {
        try {
          const computer = await prisma.computer.findUnique({
            where: { internalId: String(row['מזהה מחשב'] || row['ComputerId'] || '') },
          });
          if (!computer) {
            results.errors.push(`Rental: Computer ${row['מזהה מחשב'] || row['ComputerId']} not found`);
            continue;
          }
          await prisma.rental.create({
            data: {
              computerId: computer.id,
              clientId: String(row['מזהה לקוח'] || row['ClientId'] || ''),
              startDate: new Date(row['תאריך התחלה'] || row['StartDate']),
              expectedReturn: new Date(row['תאריך החזרה'] || row['ExpectedReturn']),
              priceMonthly: parseFloat(row['מחיר חודשי'] || row['PriceMonthly'] || computer.priceMonthly),
            },
          });
          results.rentals++;
        } catch (err) {
          results.errors.push(`Rental: ${err.message}`);
        }
      }
    }

    res.json({ message: 'ייבוא הושלם', results });
  } catch (err) {
    next(err);
  }
});

// GET /api/import/template — download Excel template
router.get('/template', (req, res, next) => {
  try {
    const wb = XLSX.utils.book_new();

    const computersData = [
      { 'מזהה פנימי': 'LP-001', 'מותג': 'Lenovo', 'דגם': 'ThinkPad T14', 'סריאלי': 'SN001', 'מחיר חודשי': 250, 'הערות': '' },
    ];
    const computersSheet = XLSX.utils.json_to_sheet(computersData);
    XLSX.utils.book_append_sheet(wb, computersSheet, 'Computers');

    const clientsData = [
      { 'שם': 'חברה לדוגמה', 'איש קשר': 'ישראל ישראלי', 'טלפון': '050-1234567', 'אימייל': 'info@example.co.il', 'כתובת': 'תל אביב' },
    ];
    const clientsSheet = XLSX.utils.json_to_sheet(clientsData);
    XLSX.utils.book_append_sheet(wb, clientsSheet, 'Clients');

    const rentalsData = [
      { 'מזהה מחשב': 'LP-001', 'מזהה לקוח': '', 'תאריך התחלה': '2024-01-01', 'תאריך החזרה': '2024-07-01', 'מחיר חודשי': 250 },
    ];
    const rentalsSheet = XLSX.utils.json_to_sheet(rentalsData);
    XLSX.utils.book_append_sheet(wb, rentalsSheet, 'Rentals');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=laptrack-template.xlsx');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
