import { prisma } from '../src/lib/prisma';
import * as bcrypt from 'bcryptjs';

async function main() {
  await prisma.license.upsert({
    where: { licenseKey: 'UST-DEMO-NEZHA-2026' },
    create: {
      licenseKey: 'UST-DEMO-NEZHA-2026',
      expiresAt: null,
    },
    update: {},
  });

  await prisma.globalSettings.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      currency: 'EUR',
      defaultConsultationPrice: 50,
      acceptedPaymentMethods: ['CASH', 'CARD', 'CHECK', 'BANK_TRANSFER'],
    },
    update: {},
  });

  const passwordHash = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@clinique.com' },
    update: { password_hash: passwordHash, nom: 'Directeur Cabinet', isActive: true },
    create: { email: 'admin@clinique.com', password_hash: passwordHash, role: 'ADMIN', nom: 'Directeur Cabinet' }
  });

  const doctor = await prisma.user.upsert({
    where: { email: 'doctor@clinique.com' },
    update: {
      password_hash: passwordHash,
      nom: 'Dr. EL MAAROUFI Nezha',
      isActive: true,
    },
    create: {
      email: 'doctor@clinique.com',
      password_hash: passwordHash,
      role: 'DOCTOR',
      nom: 'Dr. EL MAAROUFI Nezha',
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: 'staff@clinique.com' },
    update: { password_hash: passwordHash, nom: 'Accueil Secrétariat', isActive: true },
    create: { email: 'staff@clinique.com', password_hash: passwordHash, role: 'ASSISTANT', nom: 'Accueil Secrétariat' }
  });

  await prisma.prescriptionTemplate.deleteMany({});
  await prisma.prescriptionTemplate.createMany({
    data: [
      {
        titre: 'Grippe',
        contenu: [
          { nom: 'Paracétamol 1 g', posologie: '3 fois par jour après les repas', duree: '5 jours' },
          { nom: 'Vitamine C', posologie: '1 comprimé par jour', duree: '7 jours' },
        ],
      },
      {
        titre: 'Douleur / inflammation',
        contenu: [
          { nom: 'Ibuprofène 400 mg', posologie: '1 comprimé 3 fois par jour au cours des repas', duree: '3 jours' },
        ],
      },
      {
        titre: 'Toux sèche',
        contenu: [
          { nom: 'Sirop antitussif', posologie: '10 ml matin et soir', duree: '5 jours' },
        ],
      },
    ],
  });

  console.log('Seed users created:', admin.email, doctor.email, staff.email);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
