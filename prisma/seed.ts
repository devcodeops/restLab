import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const services = ['svc-alpha', 'svc-beta', 'svc-gamma'];

async function main() {
  for (const serviceName of services) {
    await prisma.serviceChaosConfig.upsert({
      where: { serviceName },
      update: {},
      create: { serviceName, mode: 'normal' },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
