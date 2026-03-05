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

  // 2. Clients (2)
  const client1 = await prisma.client.create({
    data: {
      name: 'טכנולוגיות אלון בע"מ',
      contactName: 'אלון כהן',
      phone: '050-1234567',
      email: 'alon@alon-tech.co.il',
      address: 'רחוב הרצל 15, תל אביב',
    },
  });
  const client2 = await prisma.client.create({
    data: {
      name: 'סטארטאפ נייבר',
      contactName: 'יוסי אברהם',
      phone: '054-3456789',
      email: 'yossi@nayber.io',
      address: 'רוטשילד 22, תל אביב',
    },
  });
  console.log('Created 2 clients');

  // 3. Computers (3)
  const comp1 = await prisma.computer.create({
    data: {
      internalId: 'LP-001',
      brand: 'Lenovo',
      model: 'ThinkPad T14',
      serial: 'SN-LE000001',
      specs: { ram: '16GB', storage: '512GB SSD', cpu: 'i7-1255U' },
      priceMonthly: 250,
      status: 'AVAILABLE',
    },
  });
  const comp2 = await prisma.computer.create({
    data: {
      internalId: 'LP-002',
      brand: 'Dell',
      model: 'Latitude 5530',
      serial: 'SN-DE000002',
      specs: { ram: '16GB', storage: '256GB SSD', cpu: 'i5-1235U' },
      priceMonthly: 200,
      status: 'AVAILABLE',
    },
  });
  const comp3 = await prisma.computer.create({
    data: {
      internalId: 'LP-003',
      brand: 'Apple',
      model: 'MacBook Air M2',
      serial: 'SN-AP000003',
      specs: { ram: '8GB', storage: '256GB SSD', cpu: 'M2' },
      priceMonthly: 350,
      status: 'AVAILABLE',
    },
  });
  console.log('Created 3 computers');

  // 4. One sample rental — comp2 rented to client1
  const now = new Date();
  const startDate = new Date(now);
  startDate.setMonth(startDate.getMonth() - 2);
  const expectedReturn = new Date(startDate);
  expectedReturn.setMonth(expectedReturn.getMonth() + 6);

  const rental = await prisma.rental.create({
    data: {
      computerId: comp2.id,
      clientId: client1.id,
      startDate,
      expectedReturn,
      priceMonthly: comp2.priceMonthly,
      status: 'ACTIVE',
    },
  });

  await prisma.computer.update({
    where: { id: comp2.id },
    data: { status: 'RENTED' },
  });

  // Create 2 billing cycles for the rental
  for (let m = 0; m < 2; m++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + m + 1);
    await prisma.billingCycle.create({
      data: {
        rentalId: rental.id,
        amount: comp2.priceMonthly,
        dueDate,
        status: m === 0 ? 'PAID' : 'PENDING',
        paidDate: m === 0 ? new Date(dueDate.getTime() + 3 * 24 * 60 * 60 * 1000) : null,
      },
    });
  }

  // One payment for the paid cycle
  await prisma.payment.create({
    data: {
      clientId: client1.id,
      amount: comp2.priceMonthly,
      date: new Date(),
      method: 'העברה בנקאית',
    },
  });

  console.log('Created 1 rental, 2 billing cycles, 1 payment');
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
