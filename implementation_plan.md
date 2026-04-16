# Plateforme Web pour un Cabinet de Médecine Générale - Plan d'Implémentation

Bienvenue ! Comme demandé, nous allons procéder étape par étape pour la création de cette plateforme médicale. Voici la proposition pour l'**Étape 1**.

## Proposition de la Stack Technique

Pour garantir la sécurité, la réactivité, l'optimisation, et une expérience utilisateur "Premium", voici la stack technique recommandée pour ce projet :

- **Frontend & Backend (Full-Stack Monorepo)** : **Next.js** (App Router). Cela permet d'avoir à la fois l'interface utilisateur et les APIs au même endroit, ce qui accélère le développement et facilite le déploiement.
- **Base de données** : **PostgreSQL**, car la nature des données médicales est fortement relationnelle (Médecins -> Rendez-vous -> Patients -> Factures).
- **ORM** : **Prisma**. Il offre une excellente sécurité de typage avec TypeScript et facilite les migrations de la base de données.
- **Authentification** : API Customisée avec **JWT (JSON Web Tokens)** (comme demandé dans votre Étape 2) combinée avec des cookies `HttpOnly` pour une sécurité maximale, ou **NextAuth.js** pour une intégration native. J'utiliserai JWT classique pour correspondre à vos attentes.
- **Styling** : **CSS Vanilla (CSS Modules)** avec une architecture soignée pour respecter les consignes de design dynamiques, modernes, et premium (Mode sombre possible, animations subtiles, effets glassmorphism). 
- **Génération PDF** : **pdfmake** ou **jspdf** couplé à `html2canvas` pour générer factures et ordonnances directement sur le poste de l'utilisateur sans surcharger le serveur.

## Schéma de la Base de Données (Prisma Schema)

Voici le schéma complet proposé pour notre base de données relationnelle.

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  DOCTOR
  ASSISTANT
}

enum AppointmentStatus {
  PROGRAMME        // Programmé
  WAITING_ROOM     // En salle d'attente
  IN_CONSULTATION  // En consultation
  COMPLETED        // Terminé
  CANCELED         // Annulé
}

enum PaymentMethod {
  CASH             // Espèces
  CARD             // Carte
  CHECK            // Chèque
  INSURANCE        // Tiers payant/Mutuelle
}

enum PaymentStatus {
  PENDING
  PAID
  CANCELLED
}

enum DocumentType {
  PRESCRIPTION     // Ordonnance
  ANALYSIS_REQUEST // Demande d'analyses
  CERTIFICATE      // Certificat médical
  EXTERNAL_RESULT  // Résultat externe (PDF/Image uploadé)
}

model User {
  id            String        @id @default(uuid())
  nom           String
  email         String        @unique
  password_hash String
  role          Role          @default(ASSISTANT)
  
  // Relations
  appointmentsAsDoctor Appointment[]  @relation("DoctorAppointments")
  
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
}

model Patient {
  id              String        @id @default(uuid())
  nom             String
  prenom          String
  date_naissance  DateTime
  tel             String?
  email           String?
  adresse         String?
  allergies       String?       @db.Text
  antecedents     String?       @db.Text
  
  // Relations
  appointments    Appointment[]
  
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}

model Appointment {
  id            String            @id @default(uuid())
  date_heure    DateTime
  motif         String
  statut        AppointmentStatus @default(PROGRAMME)
  
  // Relations
  doctor_id     String
  doctor        User              @relation("DoctorAppointments", fields: [doctor_id], references: [id])
  patient_id    String
  patient       Patient           @relation(fields: [patient_id], references: [id])
  
  consultation  ConsultationRecord?
  invoice       Invoice?
  
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt
}

model ConsultationRecord {
  id             String        @id @default(uuid())
  notes_medecin  String?       @db.Text // Confidentiel au médecin
  diagnostic     String?       @db.Text
  
  // Relations
  appointment_id String        @unique
  appointment    Appointment   @relation(fields: [appointment_id], references: [id])
  
  documents      Document[]
  
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
}

model Document {
  id              String             @id @default(uuid())
  type            DocumentType
  contenu         String             @db.Text // Contenu JSON ou Texte pour l'ordonnance générée
  file_url        String?            // Stockage si c'est un upload (S3, local)
  
  // Relations
  consultation_id String
  consultation    ConsultationRecord @relation(fields: [consultation_id], references: [id])
  
  createdAt       DateTime           @default(now())
}

model Invoice {
  id               String        @id @default(uuid())
  montant          Float
  methode_paiement PaymentMethod
  date_paiement    DateTime?
  statut           PaymentStatus @default(PENDING)
  
  // Relations
  appointment_id   String        @unique
  appointment      Appointment   @relation(fields: [appointment_id], references: [id])
  
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt
}
```

## User Review Required

> [!IMPORTANT]
> **Validation Requise pour l'Étape 1**
> Que pensez-vous de la Stack Technique (Next.js, PostgreSQL, Prisma) et du Schéma de Base de Données ci-dessus ?
> Si cela vous convient, donnez-moi simplement votre feu vert et je passerai à **l'Étape 2** (Génération du backend, base de données et auth JWT).
