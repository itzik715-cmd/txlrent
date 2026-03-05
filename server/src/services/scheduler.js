const cron = require('node-cron');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { sendWhatsApp, getWhatsAppSettings, getResponseUrl } = require('./notifications');

const prisma = new PrismaClient();

async function runAlertRules() {
  const settings = await getWhatsAppSettings();
  if (settings.wa_enabled !== 'true' || settings.wa_auto_alerts !== 'true') {
    console.log('[Scheduler] WhatsApp auto-alerts disabled, skipping');
    return;
  }

  const senderName = settings.wa_sender_name || 'LapTrack';

  // Get all enabled rules
  const rules = await prisma.alertRule.findMany({
    where: { enabled: true },
    orderBy: { dayOffset: 'asc' },
  });

  if (rules.length === 0) {
    console.log('[Scheduler] No alert rules configured');
    return;
  }

  for (const rule of rules) {
    await processRule(rule, senderName);
  }
}

async function processRule(rule, senderName) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let rentals = [];

  if (rule.trigger === 'before_return') {
    // dayOffset days BEFORE expectedReturn
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + rule.dayOffset);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    rentals = await prisma.rental.findMany({
      where: {
        status: 'ACTIVE',
        recurring: false,
        expectedReturn: { gte: targetDate, lt: nextDay },
      },
      include: { client: true, computer: true },
    });
  } else if (rule.trigger === 'on_return_day') {
    // On the day of expectedReturn
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    rentals = await prisma.rental.findMany({
      where: {
        status: 'ACTIVE',
        recurring: false,
        expectedReturn: { gte: today, lt: tomorrow },
      },
      include: { client: true, computer: true },
    });
  } else if (rule.trigger === 'after_overdue') {
    // dayOffset days AFTER expectedReturn (overdue)
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() - rule.dayOffset);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    rentals = await prisma.rental.findMany({
      where: {
        status: { in: ['ACTIVE', 'OVERDUE'] },
        recurring: false,
        expectedReturn: { gte: targetDate, lt: nextDay },
      },
      include: { client: true, computer: true },
    });
  }

  // Group rentals by client to send one combined message per client
  const byClient = {};
  for (const rental of rentals) {
    // Skip if already sent for this rule+rental today
    const alreadySent = await prisma.whatsAppLog.findFirst({
      where: {
        rentalId: rental.id,
        createdAt: { gte: today },
        status: 'SENT',
        message: { contains: rule.name },
      },
    });
    if (alreadySent) continue;

    if (!byClient[rental.clientId]) {
      byClient[rental.clientId] = { client: rental.client, rentals: [] };
    }
    byClient[rental.clientId].rentals.push(rental);
  }

  let sentCount = 0;
  for (const [clientId, group] of Object.entries(byClient)) {
    const { client, rentals: clientRentals } = group;
    const clientName = client.contactName || client.name;

    let message;
    if (clientRentals.length === 1) {
      // Single rental — use the original template
      const rental = clientRentals[0];
      const token = crypto.randomBytes(16).toString('hex');
      await prisma.rentalResponse.create({
        data: { token, rentalId: rental.id },
      });
      const responseUrl = getResponseUrl(token);
      const daysLeft = rental.expectedReturn
        ? Math.ceil((new Date(rental.expectedReturn) - new Date()) / (1000 * 60 * 60 * 24))
        : null;

      message = rule.template
        .replace(/\{clientName\}/g, clientName)
        .replace(/\{computerName\}/g, `${rental.computer.brand} ${rental.computer.model}`)
        .replace(/\{computerId\}/g, rental.computer.internalId)
        .replace(/\{daysLeft\}/g, daysLeft !== null ? String(Math.abs(daysLeft)) : 'לא ידוע')
        .replace(/\{expectedReturn\}/g, rental.expectedReturn ? new Date(rental.expectedReturn).toLocaleDateString('he-IL') : 'חודשי')
        .replace(/\{senderName\}/g, senderName)
        .replace(/\{responseUrl\}/g, responseUrl);
    } else {
      // Multiple rentals — build combined message
      const computerLines = [];
      const responseLines = [];
      for (const rental of clientRentals) {
        const token = crypto.randomBytes(16).toString('hex');
        await prisma.rentalResponse.create({
          data: { token, rentalId: rental.id },
        });
        const responseUrl = getResponseUrl(token);
        const daysLeft = rental.expectedReturn
          ? Math.ceil((new Date(rental.expectedReturn) - new Date()) / (1000 * 60 * 60 * 24))
          : null;
        const returnInfo = rental.expectedReturn
          ? `עד ${new Date(rental.expectedReturn).toLocaleDateString('he-IL')}${daysLeft !== null ? ` (עוד ${Math.abs(daysLeft)} ימים)` : ''}`
          : 'חודשי מתחדש';
        computerLines.push(`• ${rental.computer.internalId} (${rental.computer.brand} ${rental.computer.model}) — ${returnInfo}`);
        responseLines.push(`${rental.computer.internalId}: ${responseUrl}`);
      }

      message = `היי ${clientName}, כאן ${senderName} ממחלקת התפעול\n` +
        `שמנו לב שיש לך ${clientRentals.length} מחשבים שמתקרבים לסוף תקופת ההשכרה:\n\n` +
        computerLines.join('\n') +
        `\n\nלכל מחשב ניתן לבחור: חידוש / החזרה / שליח לאיסוף\n` +
        responseLines.join('\n');
    }

    const result = await sendWhatsApp(client.phone, message);

    // Log for each rental in the group
    for (const rental of clientRentals) {
      await prisma.whatsAppLog.create({
        data: {
          rentalId: rental.id,
          clientId,
          phone: client.phone,
          message: `[${rule.name}] ${message}`,
          status: result.sent ? 'SENT' : 'FAILED',
          response: result.sent ? null : (result.reason || null),
        },
      });
    }

    if (result.sent) sentCount++;
  }

  console.log(`[Scheduler] Rule "${rule.name}": ${rentals.length} matched, ${Object.keys(byClient).length} clients, ${sentCount} sent`);
}

async function checkOverdueBilling() {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const overdueCycles = await prisma.billingCycle.findMany({
    where: {
      status: { in: ['PENDING', 'OVERDUE'] },
      dueDate: { lt: fourteenDaysAgo },
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

function start() {
  // Run daily at 08:00
  cron.schedule('0 8 * * *', async () => {
    console.log('[Scheduler] Running daily checks...');
    try {
      await runAlertRules();
      await checkOverdueBilling();
    } catch (err) {
      console.error('[Scheduler] Error:', err);
    }
  });

  console.log('[Scheduler] Initialized, running daily at 08:00');
}

module.exports = { start };
