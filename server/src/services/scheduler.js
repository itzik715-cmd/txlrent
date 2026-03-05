const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const { sendWhatsApp, sendEmail } = require('./notifications');

const prisma = new PrismaClient();

async function checkTodayReturns() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const rentals = await prisma.rental.findMany({
    where: {
      status: 'ACTIVE',
      expectedReturn: { gte: today, lt: tomorrow },
    },
    include: { client: true, computer: true },
  });

  for (const rental of rentals) {
    const msg = `שלום ${rental.client.contactName}, תזכורת: מחשב ${rental.computer.internalId} (${rental.computer.brand} ${rental.computer.model}) צפוי להחזרה היום. תודה, LapTrack`;
    await sendWhatsApp(rental.client.phone, msg);
  }

  console.log(`[Scheduler] Checked today returns: ${rentals.length} found`);
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

  // Update status to OVERDUE
  const overdueIds = overdueCycles.filter(c => c.status === 'PENDING').map(c => c.id);
  if (overdueIds.length > 0) {
    await prisma.billingCycle.updateMany({
      where: { id: { in: overdueIds } },
      data: { status: 'OVERDUE' },
    });
  }

  // Group by client
  const clientMap = new Map();
  for (const cycle of overdueCycles) {
    const clientId = cycle.rental.clientId;
    if (!clientMap.has(clientId)) {
      clientMap.set(clientId, { client: cycle.rental.client, total: 0 });
    }
    clientMap.get(clientId).total += cycle.amount;
  }

  for (const [, { client, total }] of clientMap) {
    const msg = `שלום ${client.contactName}, יש לך חוב פתוח של ${total} ש"ח. נא להסדיר בהקדם. תודה, LapTrack`;
    await sendWhatsApp(client.phone, msg);
    if (client.email) {
      await sendEmail(client.email, 'תזכורת חוב - LapTrack', `<p>${msg}</p>`);
    }
  }

  console.log(`[Scheduler] Checked overdue billing: ${overdueCycles.length} cycles, ${clientMap.size} clients`);
}

async function checkExpiringRentals() {
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  const fourDaysFromNow = new Date();
  fourDaysFromNow.setDate(fourDaysFromNow.getDate() + 4);

  const rentals = await prisma.rental.findMany({
    where: {
      status: 'ACTIVE',
      expectedReturn: { gte: threeDaysFromNow, lt: fourDaysFromNow },
    },
    include: { client: true, computer: true },
  });

  for (const rental of rentals) {
    const msg = `שלום ${rental.client.contactName}, תזכורת: מחשב ${rental.computer.internalId} צפוי להחזרה בעוד 3 ימים. תודה, LapTrack`;
    await sendWhatsApp(rental.client.phone, msg);
  }

  console.log(`[Scheduler] Checked expiring rentals (3 days): ${rentals.length} found`);
}

function start() {
  // Run daily at 08:00
  cron.schedule('0 8 * * *', async () => {
    console.log('[Scheduler] Running daily checks...');
    try {
      await checkTodayReturns();
      await checkOverdueBilling();
      await checkExpiringRentals();
    } catch (err) {
      console.error('[Scheduler] Error:', err);
    }
  });

  console.log('[Scheduler] Initialized, running daily at 08:00');
}

module.exports = { start };
