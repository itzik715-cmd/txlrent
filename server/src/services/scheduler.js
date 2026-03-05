const cron = require('node-cron');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { sendWhatsApp, getWhatsAppSettings } = require('./notifications');

const prisma = new PrismaClient();

async function checkExpiringRentals() {
  const settings = await getWhatsAppSettings();
  if (settings.wa_enabled !== 'true' || settings.wa_auto_alerts !== 'true') {
    console.log('[Scheduler] WhatsApp auto-alerts disabled, skipping');
    return;
  }

  const daysBefore = parseInt(settings.wa_alert_days_before) || 3;
  const senderName = settings.wa_sender_name || 'LapTrack';

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + daysBefore);
  targetDate.setHours(0, 0, 0, 0);
  const nextDay = new Date(targetDate);
  nextDay.setDate(nextDay.getDate() + 1);

  const rentals = await prisma.rental.findMany({
    where: {
      status: 'ACTIVE',
      recurring: false,
      expectedReturn: { gte: targetDate, lt: nextDay },
    },
    include: { client: true, computer: true },
  });

  const template = settings.wa_template_expiring || getDefaultTemplate();

  for (const rental of rentals) {
    // Check if we already sent for this rental today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const alreadySent = await prisma.whatsAppLog.findFirst({
      where: {
        rentalId: rental.id,
        createdAt: { gte: today },
        status: 'SENT',
      },
    });
    if (alreadySent) continue;

    // Create response token
    const token = crypto.randomBytes(16).toString('hex');
    await prisma.rentalResponse.create({
      data: { token, rentalId: rental.id },
    });

    const responseUrl = `https://5.100.255.162/r/${token}`;
    const daysLeft = Math.ceil((new Date(rental.expectedReturn) - new Date()) / (1000 * 60 * 60 * 24));

    const message = template
      .replace(/\{clientName\}/g, rental.client.contactName || rental.client.name)
      .replace(/\{computerName\}/g, `${rental.computer.brand} ${rental.computer.model}`)
      .replace(/\{computerId\}/g, rental.computer.internalId)
      .replace(/\{daysLeft\}/g, String(daysLeft))
      .replace(/\{expectedReturn\}/g, new Date(rental.expectedReturn).toLocaleDateString('he-IL'))
      .replace(/\{senderName\}/g, senderName)
      .replace(/\{responseUrl\}/g, responseUrl);

    const result = await sendWhatsApp(rental.client.phone, message);

    await prisma.whatsAppLog.create({
      data: {
        rentalId: rental.id,
        clientId: rental.clientId,
        phone: rental.client.phone,
        message,
        status: result.sent ? 'SENT' : 'FAILED',
        response: result.sent ? null : (result.reason || null),
      },
    });
  }

  console.log(`[Scheduler] Checked expiring rentals (${daysBefore} days): ${rentals.length} found`);
}

async function checkOverdueBilling() {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const overdueCycles = await prisma.billingCycle.findMany({
    where: {
      status: { in: ['PENDING', 'OVERDUE'] },
      dueDate: { lt: fourteenDaysAgo },
    },
    include: {
      rental: { include: { client: true, computer: true } },
    },
  });

  const overdueIds = overdueCycles.filter(c => c.status === 'PENDING').map(c => c.id);
  if (overdueIds.length > 0) {
    await prisma.billingCycle.updateMany({
      where: { id: { in: overdueIds } },
      data: { status: 'OVERDUE' },
    });
  }

  console.log(`[Scheduler] Checked overdue billing: ${overdueCycles.length} cycles`);
}

function getDefaultTemplate() {
  return `היי {clientName}, כאן {senderName} ממחלקת התפעול
שמנו לב שבעוד {daysLeft} ימים ({expectedReturn}) מסתיימת לך תקופת השכרת המחשב {computerId}, אבל היי אל דאגה!

לבחירתך 3 אפשרויות:
1. נא חדשו עבורי לתקופה נוספת
2. ברצוני להחזיר לאחת מנקודות האיסוף
3. ברצוני להזמין שליח לאיסוף המחשב בעלות 50 ש"ח

לבחירה לחצו כאן: {responseUrl}`;
}

function start() {
  // Run daily at 08:00
  cron.schedule('0 8 * * *', async () => {
    console.log('[Scheduler] Running daily checks...');
    try {
      await checkExpiringRentals();
      await checkOverdueBilling();
    } catch (err) {
      console.error('[Scheduler] Error:', err);
    }
  });

  console.log('[Scheduler] Initialized, running daily at 08:00');
}

module.exports = { start };
