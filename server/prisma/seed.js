const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clear existing data
  await prisma.billingCycle.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.rental.deleteMany();
  await prisma.computer.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();

  // 1. Users
  const adminPassword = await bcrypt.hash('admin123', 10);
  const officePassword = await bcrypt.hash('office123', 10);

  await prisma.user.createMany({
    data: [
      { email: 'admin@laptrack.co.il', password: adminPassword, name: 'מנהל ראשי', role: 'admin' },
      { email: 'office@laptrack.co.il', password: officePassword, name: 'משרד', role: 'user' },
    ],
  });
  console.log('Created 2 users');

  // 2. Clients (20)
  const clientNames = [
    { name: 'טכנולוגיות אלון בע"מ', contactName: 'אלון כהן', phone: '050-1234567', email: 'alon@alon-tech.co.il', address: 'רחוב הרצל 15, תל אביב' },
    { name: 'מגדל ביטוח', contactName: 'רונית לוי', phone: '052-2345678', email: 'ronit@migdal.co.il', address: 'דרך פתח תקווה 48, תל אביב' },
    { name: 'סטארטאפ נייבר', contactName: 'יוסי אברהם', phone: '054-3456789', email: 'yossi@nayber.io', address: 'רוטשילד 22, תל אביב' },
    { name: 'בית ספר אורט', contactName: 'מיכל דוד', phone: '050-4567890', email: 'michal@ort.org.il', address: 'רחוב ז\'בוטינסקי 10, רמת גן' },
    { name: 'עיריית חולון', contactName: 'דוד חיימוביץ', phone: '053-5678901', email: 'david@holon.muni.il', address: 'רחוב ויצמן 58, חולון' },
    { name: 'קבוצת שלמה', contactName: 'שלמה ביטון', phone: '050-6789012', email: 'shlomo@shlomo-group.co.il', address: 'רחוב הברזל 30, תל אביב' },
    { name: 'מכון ויצמן', contactName: 'ד"ר נעמי שרון', phone: '054-7890123', email: 'naomi@weizmann.ac.il', address: 'רחוב הרצל 234, רחובות' },
    { name: 'אוניברסיטת בר אילן', contactName: 'פרופ\' חיים גולד', phone: '052-8901234', email: 'chaim@biu.ac.il', address: 'רמת גן' },
    { name: 'חברת נתיבי ישראל', contactName: 'אורי מלכה', phone: '050-9012345', email: 'uri@iroads.co.il', address: 'רחוב יגאל אלון 56, תל אביב' },
    { name: 'משרד עורכי דין כספי', contactName: 'עו"ד רחל כספי', phone: '053-0123456', email: 'rachel@kaspi-law.co.il', address: 'מגדל אלקטרה, תל אביב' },
    { name: 'קליניקת שיניים ד"ר גרין', contactName: 'ד"ר אבי גרין', phone: '054-1122334', email: 'avi@drgreen.co.il', address: 'רחוב סוקולוב 44, הרצליה' },
    { name: 'מפעלי תנובה', contactName: 'יעקב פרץ', phone: '050-2233445', email: 'yaakov@tnuva.co.il', address: 'רחוב המסגר 7, תל אביב' },
    { name: 'סופר פארם', contactName: 'שרה מזרחי', phone: '052-3344556', email: 'sara@super-pharm.co.il', address: 'רחוב ביאליק 32, רמת גן' },
    { name: 'חברת החשמל', contactName: 'משה דיין', phone: '054-4455667', email: 'moshe@iec.co.il', address: 'רחוב החשמל 1, חיפה' },
    { name: 'בזק בינלאומי', contactName: 'נתן שפירא', phone: '050-5566778', email: 'natan@bezeq.co.il', address: 'רחוב השלום 7, תל אביב' },
    { name: 'אלביט מערכות', contactName: 'רון אלגרבלי', phone: '053-6677889', email: 'ron@elbitsystems.com', address: 'רחוב התעשייה 10, חיפה' },
    { name: 'סלקום', contactName: 'ליאת בן דוד', phone: '054-7788990', email: 'liat@cellcom.co.il', address: 'נתיבי איילון 7, תל אביב' },
    { name: 'בנק לאומי - סניף מרכז', contactName: 'אהרון שטרן', phone: '050-8899001', email: 'aharon@leumi.co.il', address: 'רחוב יהודה הלוי 35, תל אביב' },
    { name: 'קבוצת דלק', contactName: 'גיא בר לב', phone: '052-9900112', email: 'guy@delek.co.il', address: 'רחוב אבא הלל 7, רמת גן' },
    { name: 'חברת מליסרון', contactName: 'טל רוזנברג', phone: '054-0011223', email: 'tal@melisron.co.il', address: 'דרך ז\'בוטינסקי 1, רמת גן' },
  ];

  const clients = [];
  for (const c of clientNames) {
    const client = await prisma.client.create({ data: c });
    clients.push(client);
  }
  console.log('Created 20 clients');

  // 3. Computers (400)
  const brands = [
    { brand: 'Lenovo', models: ['ThinkPad T14', 'ThinkPad T480', 'ThinkPad X1 Carbon', 'IdeaPad 5', 'ThinkPad L14', 'ThinkPad E14'] },
    { brand: 'Dell', models: ['Latitude 5530', 'Latitude 7430', 'Inspiron 15', 'Vostro 3520', 'Latitude 5420', 'XPS 13'] },
    { brand: 'HP', models: ['EliteBook 840', 'ProBook 450', 'Pavilion 15', 'EliteBook 850', 'ProBook 440', 'ZBook 15'] },
    { brand: 'Apple', models: ['MacBook Air M1', 'MacBook Air M2', 'MacBook Pro 14 M2', 'MacBook Pro 16 M2', 'MacBook Air M3'] },
  ];

  const prices = [150, 180, 200, 220, 250, 280, 300, 320, 350, 380, 400, 450];
  const computers = [];

  for (let i = 1; i <= 400; i++) {
    const brandObj = brands[Math.floor(Math.random() * brands.length)];
    const model = brandObj.models[Math.floor(Math.random() * brandObj.models.length)];
    const price = prices[Math.floor(Math.random() * prices.length)];
    const id = String(i).padStart(3, '0');

    const specs = {
      ram: [8, 16, 32][Math.floor(Math.random() * 3)] + 'GB',
      storage: [256, 512, 1024][Math.floor(Math.random() * 3)] + 'GB SSD',
      cpu: brandObj.brand === 'Apple'
        ? ['M1', 'M2', 'M3'][Math.floor(Math.random() * 3)]
        : ['i5-1235U', 'i7-1255U', 'i5-1345U', 'i7-1365U', 'Ryzen 5 7530U'][Math.floor(Math.random() * 5)],
    };

    const computer = await prisma.computer.create({
      data: {
        internalId: `LP-${id}`,
        brand: brandObj.brand,
        model,
        serial: `SN-${brandObj.brand.substring(0, 2).toUpperCase()}${String(i).padStart(6, '0')}`,
        specs,
        priceMonthly: price,
        status: 'AVAILABLE',
      },
    });
    computers.push(computer);
  }
  console.log('Created 400 computers');

  // 4. Set some computers to MAINTENANCE (20)
  const maintenanceIds = [];
  for (let i = 0; i < 20; i++) {
    const idx = 300 + i; // computers 301-320
    maintenanceIds.push(computers[idx].id);
  }
  await prisma.computer.updateMany({
    where: { id: { in: maintenanceIds } },
    data: { status: 'MAINTENANCE' },
  });
  console.log('Set 20 computers to MAINTENANCE');

  // 5. Rentals (280 active)
  const now = new Date();
  const rentals = [];
  const usedComputerIds = new Set();

  for (let i = 0; i < 280; i++) {
    // Pick a random available computer (not maintenance, not already rented)
    let computerIdx;
    do {
      computerIdx = Math.floor(Math.random() * 300); // only first 300, skip maintenance ones
    } while (usedComputerIds.has(computerIdx));
    usedComputerIds.add(computerIdx);

    const computer = computers[computerIdx];
    const client = clients[Math.floor(Math.random() * clients.length)];

    // Random start date 1-6 months ago
    const monthsAgo = Math.floor(Math.random() * 6) + 1;
    const startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - monthsAgo);

    // Expected return 3-12 months from start
    const rentalMonths = Math.floor(Math.random() * 10) + 3;
    const expectedReturn = new Date(startDate);
    expectedReturn.setMonth(expectedReturn.getMonth() + rentalMonths);

    const rental = await prisma.rental.create({
      data: {
        computerId: computer.id,
        clientId: client.id,
        startDate,
        expectedReturn,
        priceMonthly: computer.priceMonthly,
        status: 'ACTIVE',
      },
    });
    rentals.push({ rental, startDate, computer, client });

    // Set computer to RENTED
    await prisma.computer.update({
      where: { id: computer.id },
      data: { status: 'RENTED' },
    });
  }
  console.log('Created 280 rentals');

  // 6. Mark some as OVERDUE (where expectedReturn is past)
  const overdueRentals = rentals.filter(r => r.rental.expectedReturn < now);
  if (overdueRentals.length > 0) {
    await prisma.rental.updateMany({
      where: { id: { in: overdueRentals.map(r => r.rental.id) } },
      data: { status: 'OVERDUE' },
    });
    console.log(`Marked ${overdueRentals.length} rentals as OVERDUE`);
  }

  // 7. Billing cycles for all rentals
  let totalCycles = 0;
  for (const { rental, startDate } of rentals) {
    const monthsSinceStart = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24 * 30));
    const cyclesToCreate = Math.min(monthsSinceStart, 12);

    for (let m = 0; m < cyclesToCreate; m++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + m + 1);

      // Decide status: older cycles more likely paid
      const isPaid = m < cyclesToCreate - 2 ? Math.random() > 0.15 : Math.random() > 0.6;

      await prisma.billingCycle.create({
        data: {
          rentalId: rental.id,
          amount: rental.priceMonthly,
          dueDate,
          status: isPaid ? 'PAID' : (dueDate < now ? 'OVERDUE' : 'PENDING'),
          paidDate: isPaid ? new Date(dueDate.getTime() + Math.random() * 14 * 24 * 60 * 60 * 1000) : null,
        },
      });
      totalCycles++;
    }
  }
  console.log(`Created ${totalCycles} billing cycles`);

  // 8. Payments (for paid billing cycles, group some by client)
  const paidCycles = await prisma.billingCycle.findMany({
    where: { status: 'PAID' },
    include: { rental: true },
  });

  // Group paid cycles by client and rough date
  const paymentGroups = new Map();
  for (const cycle of paidCycles) {
    const key = `${cycle.rental.clientId}-${cycle.paidDate?.toISOString().substring(0, 7)}`;
    if (!paymentGroups.has(key)) {
      paymentGroups.set(key, { clientId: cycle.rental.clientId, amount: 0, date: cycle.paidDate });
    }
    paymentGroups.get(key).amount += cycle.amount;
  }

  const methods = ['מזומן', 'העברה בנקאית', 'כרטיס אשראי', 'צ\'ק', 'ביט'];
  let paymentCount = 0;
  for (const [, pg] of paymentGroups) {
    await prisma.payment.create({
      data: {
        clientId: pg.clientId,
        amount: pg.amount,
        date: pg.date || new Date(),
        method: methods[Math.floor(Math.random() * methods.length)],
      },
    });
    paymentCount++;
  }
  console.log(`Created ${paymentCount} payments`);

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
