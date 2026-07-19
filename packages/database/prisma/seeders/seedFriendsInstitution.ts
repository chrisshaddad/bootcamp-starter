import { PrismaClient } from '../../src/generated/prisma/client';

// A single, richly-populated test institution — staffed and patronized by
// Friends characters — so every dashboard stat (per role) has real data to
// show: record-type/trend charts, unassigned-patient counts, follow-ups and
// vaccinations due, and per-staff recent registrations.
//
// Main characters cover the three non-admin-platform roles so they're easy
// to log in as and memorize; minor characters fill out the patient list for
// volume and variety. Not idempotent — run against a freshly reset database.

type StaffRole = 'INSTITUTION_ADMIN' | 'STAFF' | 'PROFESSIONAL';

interface MainCharacterSeed {
  key: string;
  fullName: string;
  email: string;
  phone: string;
  role: StaffRole;
  specialty?: string;
  bio?: string;
}

interface PatientSeed {
  key: string;
  fullName: string;
  email: string;
  phone: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  registeredBy: string; // key into MAIN_CHARACTERS (a STAFF member)
  daysAgoCreated: number;
  assignedTo: string[]; // keys into MAIN_CHARACTERS (PROFESSIONAL members)
}

interface RecordSeed {
  patient: string; // PatientSeed key
  uploadedBy: string; // PROFESSIONAL key
  daysAgoCreated: number;
  recordType: 'LAB_RESULT' | 'CONSULTATION' | 'PRESCRIPTION' | 'SCAN' | 'VACCINATION';
  labResult?: { testName: string; labName: string };
  consultation?: {
    chiefComplaint: string;
    findings: string;
    diagnosis: string;
    plan: string;
    followUpInDays: number; // negative = overdue
  };
  scan?: { modalityType: 'XRAY' | 'MRI' | 'CT' | 'ULTRASOUND' | 'OTHER'; bodyPart: string; radiologistName: string };
  prescriptionItems?: {
    medicationName: string;
    dosage: string;
    frequency: string;
    duration: string;
    route: 'ORAL' | 'IV' | 'TOPICAL' | 'INHALATION' | 'OTHER';
  }[];
  vaccination?: { vaccineName: string; doseNumber: number; nextDoseInDays: number };
}

const MAIN_CHARACTERS: MainCharacterSeed[] = [
  {
    key: 'monica',
    fullName: 'Monica Geller',
    email: 'monica.geller@centralperkmed.example.com',
    phone: '+12125550111',
    role: 'INSTITUTION_ADMIN',
  },
  {
    key: 'rachel',
    fullName: 'Rachel Green',
    email: 'rachel.green@centralperkmed.example.com',
    phone: '+12125550112',
    role: 'STAFF',
  },
  {
    key: 'chandler',
    fullName: 'Chandler Bing',
    email: 'chandler.bing@centralperkmed.example.com',
    phone: '+12125550113',
    role: 'STAFF',
  },
  {
    key: 'phoebe',
    fullName: 'Phoebe Buffay',
    email: 'phoebe.buffay@centralperkmed.example.com',
    phone: '+12125550114',
    role: 'STAFF',
  },
  {
    key: 'ross',
    fullName: 'Ross Geller',
    email: 'ross.geller@centralperkmed.example.com',
    phone: '+12125550115',
    role: 'PROFESSIONAL',
    specialty: 'Internal Medicine',
    bio: 'Dr. Geller keeps things strictly evidence-based — no dinosaurs involved, we checked.',
  },
  {
    key: 'joey',
    fullName: 'Joey Tribbiani',
    email: 'joey.tribbiani@centralperkmed.example.com',
    phone: '+12125550116',
    role: 'PROFESSIONAL',
    specialty: 'Neurosurgery',
    bio: 'Formerly known to daytime television as Dr. Drake Ramoray. He IS a doctor.',
  },
];

const PATIENTS: PatientSeed[] = [
  {
    key: 'gunther',
    fullName: 'Gunther',
    email: 'gunther@centralperkmed.example.com',
    phone: '+12125550201',
    gender: 'MALE',
    registeredBy: 'rachel',
    daysAgoCreated: 28,
    assignedTo: ['ross'],
  },
  {
    key: 'janice',
    fullName: 'Janice Litman-Goralnik',
    email: 'janice.litman@centralperkmed.example.com',
    phone: '+12125550202',
    gender: 'FEMALE',
    registeredBy: 'rachel',
    daysAgoCreated: 24,
    assignedTo: ['joey'],
  },
  {
    key: 'emily',
    fullName: 'Emily Waltham',
    email: 'emily.waltham@centralperkmed.example.com',
    phone: '+12125550203',
    gender: 'FEMALE',
    registeredBy: 'rachel',
    daysAgoCreated: 19,
    assignedTo: ['ross'],
  },
  {
    key: 'richard',
    fullName: 'Richard Burke',
    email: 'richard.burke@centralperkmed.example.com',
    phone: '+12125550204',
    gender: 'MALE',
    registeredBy: 'rachel',
    daysAgoCreated: 15,
    assignedTo: ['joey'],
  },
  {
    key: 'mike',
    fullName: 'Mike Hannigan',
    email: 'mike.hannigan@centralperkmed.example.com',
    phone: '+12125550205',
    gender: 'MALE',
    registeredBy: 'rachel',
    daysAgoCreated: 6,
    assignedTo: ['ross', 'joey'],
  },
  {
    key: 'charlie',
    fullName: 'Charlie Wheeler',
    email: 'charlie.wheeler@centralperkmed.example.com',
    phone: '+12125550206',
    gender: 'FEMALE',
    registeredBy: 'chandler',
    daysAgoCreated: 26,
    assignedTo: ['joey'],
  },
  {
    key: 'david',
    fullName: 'David Aaronson',
    email: 'david.aaronson@centralperkmed.example.com',
    phone: '+12125550207',
    gender: 'MALE',
    registeredBy: 'chandler',
    daysAgoCreated: 22,
    assignedTo: ['ross'],
  },
  {
    key: 'tag',
    fullName: 'Tag Jones',
    email: 'tag.jones@centralperkmed.example.com',
    phone: '+12125550208',
    gender: 'MALE',
    registeredBy: 'chandler',
    daysAgoCreated: 17,
    assignedTo: [],
  },
  {
    key: 'kathy',
    fullName: 'Kathy',
    email: 'kathy@centralperkmed.example.com',
    phone: '+12125550209',
    gender: 'FEMALE',
    registeredBy: 'chandler',
    daysAgoCreated: 9,
    assignedTo: ['ross'],
  },
  {
    key: 'julie',
    fullName: 'Julie',
    email: 'julie@centralperkmed.example.com',
    phone: '+12125550210',
    gender: 'FEMALE',
    registeredBy: 'chandler',
    daysAgoCreated: 3,
    assignedTo: [],
  },
  {
    key: 'estelle',
    fullName: 'Estelle Leonard',
    email: 'estelle.leonard@centralperkmed.example.com',
    phone: '+12125550211',
    gender: 'FEMALE',
    registeredBy: 'phoebe',
    daysAgoCreated: 20,
    assignedTo: ['joey'],
  },
  {
    key: 'susan',
    fullName: 'Susan Bunch',
    email: 'susan.bunch@centralperkmed.example.com',
    phone: '+12125550212',
    gender: 'FEMALE',
    registeredBy: 'phoebe',
    daysAgoCreated: 16,
    assignedTo: ['ross'],
  },
  {
    key: 'carol',
    fullName: 'Carol Willick',
    email: 'carol.willick@centralperkmed.example.com',
    phone: '+12125550213',
    gender: 'FEMALE',
    registeredBy: 'phoebe',
    daysAgoCreated: 12,
    assignedTo: ['joey'],
  },
  {
    key: 'barry',
    fullName: 'Barry Farber',
    email: 'barry.farber@centralperkmed.example.com',
    phone: '+12125550214',
    gender: 'MALE',
    registeredBy: 'phoebe',
    daysAgoCreated: 5,
    assignedTo: [],
  },
  {
    key: 'amy',
    fullName: 'Amy Green',
    email: 'amy.green@centralperkmed.example.com',
    phone: '+12125550215',
    gender: 'FEMALE',
    registeredBy: 'phoebe',
    daysAgoCreated: 2,
    assignedTo: ['ross', 'joey'],
  },
  {
    key: 'jack',
    fullName: 'Jack Geller',
    email: 'jack.geller@centralperkmed.example.com',
    phone: '+12125550216',
    gender: 'MALE',
    registeredBy: 'phoebe',
    daysAgoCreated: 0,
    assignedTo: [],
  },
];

const RECORDS: RecordSeed[] = [
  // Ross Geller's uploads
  {
    patient: 'gunther',
    uploadedBy: 'ross',
    daysAgoCreated: 2,
    recordType: 'LAB_RESULT',
    labResult: { testName: 'Complete Blood Count', labName: 'Central Perk Labs' },
  },
  {
    patient: 'emily',
    uploadedBy: 'ross',
    daysAgoCreated: 1,
    recordType: 'CONSULTATION',
    consultation: {
      chiefComplaint: 'Persistent headaches',
      findings: 'No red flags on neuro exam',
      diagnosis: 'Tension headache',
      plan: 'Rest, hydration, follow up if symptoms persist',
      followUpInDays: 5,
    },
  },
  {
    patient: 'david',
    uploadedBy: 'ross',
    daysAgoCreated: 9,
    recordType: 'CONSULTATION',
    consultation: {
      chiefComplaint: 'Follow-up on lab anomaly',
      findings: 'Mild vitamin D deficiency',
      diagnosis: 'Vitamin D insufficiency',
      plan: 'Supplement course, recheck levels',
      followUpInDays: -3, // overdue
    },
  },
  {
    patient: 'kathy',
    uploadedBy: 'ross',
    daysAgoCreated: 4,
    recordType: 'SCAN',
    scan: { modalityType: 'XRAY', bodyPart: 'Chest', radiologistName: 'Dr. Ross Geller' },
  },
  {
    patient: 'susan',
    uploadedBy: 'ross',
    daysAgoCreated: 6,
    recordType: 'PRESCRIPTION',
    prescriptionItems: [
      {
        medicationName: 'Amoxicillin',
        dosage: '500mg',
        frequency: '3x daily',
        duration: '7 days',
        route: 'ORAL',
      },
    ],
  },
  {
    patient: 'amy',
    uploadedBy: 'ross',
    daysAgoCreated: 3,
    recordType: 'VACCINATION',
    vaccination: { vaccineName: 'Influenza', doseNumber: 1, nextDoseInDays: 10 },
  },
  {
    patient: 'mike',
    uploadedBy: 'ross',
    daysAgoCreated: 20,
    recordType: 'VACCINATION',
    vaccination: { vaccineName: 'Tetanus Booster', doseNumber: 2, nextDoseInDays: -5 }, // overdue
  },

  // Joey Tribbiani's uploads
  {
    patient: 'janice',
    uploadedBy: 'joey',
    daysAgoCreated: 5,
    recordType: 'LAB_RESULT',
    labResult: { testName: 'Lipid Panel', labName: 'Central Perk Labs' },
  },
  {
    patient: 'richard',
    uploadedBy: 'joey',
    daysAgoCreated: 2,
    recordType: 'CONSULTATION',
    consultation: {
      chiefComplaint: 'Vision check-up',
      findings: 'Unremarkable',
      diagnosis: 'No acute findings',
      plan: 'Routine follow-up',
      followUpInDays: 8,
    },
  },
  {
    patient: 'charlie',
    uploadedBy: 'joey',
    daysAgoCreated: 10,
    recordType: 'CONSULTATION',
    consultation: {
      chiefComplaint: 'Neurological follow-up',
      findings: 'Stable',
      diagnosis: 'Post-concussion syndrome, resolving',
      plan: 'Continue monitoring',
      followUpInDays: -1, // overdue
    },
  },
  {
    patient: 'estelle',
    uploadedBy: 'joey',
    daysAgoCreated: 1,
    recordType: 'SCAN',
    scan: { modalityType: 'MRI', bodyPart: 'Brain', radiologistName: 'Dr. Joey Tribbiani' },
  },
  {
    patient: 'carol',
    uploadedBy: 'joey',
    daysAgoCreated: 3,
    recordType: 'PRESCRIPTION',
    prescriptionItems: [
      {
        medicationName: 'Lisinopril',
        dosage: '10mg',
        frequency: '1x daily',
        duration: '30 days',
        route: 'ORAL',
      },
    ],
  },
  {
    patient: 'charlie',
    uploadedBy: 'joey',
    daysAgoCreated: 4,
    recordType: 'VACCINATION',
    vaccination: { vaccineName: 'MMR Booster', doseNumber: 1, nextDoseInDays: 13 },
  },
];

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function addDays(from: Date, days: number): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
}

export async function seedFriendsInstitution(prisma: PrismaClient) {
  console.log('Seeding Friends test institution...');

  const superAdmin = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' },
  });
  if (!superAdmin) {
    throw new Error('No super admin found. Seed super admins first.');
  }

  const institution = await prisma.institution.create({
    data: {
      name: 'Central Perk Medical Center',
      type: 'CLINIC',
      status: 'ACTIVE',
      address: '90 Bedford St, New York, NY',
    },
  });

  // --- Main characters (admin, staff, professionals) ---
  const staffIds = new Map<string, string>(); // key -> userId

  const monica = MAIN_CHARACTERS.find((c) => c.key === 'monica')!;
  const monicaUser = await prisma.user.create({
    data: {
      fullName: monica.fullName,
      email: monica.email,
      phone: monica.phone,
      role: monica.role,
      isConfirmed: true,
      institutionId: institution.id,
      createdById: superAdmin.id,
    },
  });
  staffIds.set('monica', monicaUser.id);

  for (const character of MAIN_CHARACTERS.filter((c) => c.key !== 'monica')) {
    const user = await prisma.user.create({
      data: {
        fullName: character.fullName,
        email: character.email,
        phone: character.phone,
        role: character.role,
        isConfirmed: true,
        institutionId: institution.id,
        createdById: monicaUser.id,
      },
    });
    staffIds.set(character.key, user.id);

    if (character.role === 'PROFESSIONAL') {
      await prisma.professionalProfile.create({
        data: {
          userId: user.id,
          specialty: character.specialty!,
          bio: character.bio ?? null,
        },
      });
    }
  }

  // --- Patients ---
  const patientIds = new Map<string, string>(); // key -> patientId

  for (const p of PATIENTS) {
    const createdAt = daysAgo(p.daysAgoCreated);
    const user = await prisma.user.create({
      data: {
        fullName: p.fullName,
        email: p.email,
        phone: p.phone,
        role: 'PATIENT',
        isConfirmed: true,
        institutionId: institution.id,
        createdById: staffIds.get(p.registeredBy),
        createdAt,
      },
    });

    const patient = await prisma.patient.create({
      data: {
        userId: user.id,
        institutionId: institution.id,
        gender: p.gender,
        createdAt,
      },
    });
    patientIds.set(p.key, patient.id);
  }

  // --- Assignments (care team) ---
  const assignmentIds = new Map<string, string>(); // `${patientKey}:${professionalKey}` -> assignmentId

  for (const p of PATIENTS) {
    for (const professionalKey of p.assignedTo) {
      const assignment = await prisma.assignment.create({
        data: {
          patientId: patientIds.get(p.key)!,
          professionalId: staffIds.get(professionalKey)!,
          assignedById: staffIds.get(p.registeredBy)!,
          institutionId: institution.id,
          status: 'ACTIVE',
        },
      });
      assignmentIds.set(`${p.key}:${professionalKey}`, assignment.id);
    }
  }

  // --- Medical records ---
  for (const r of RECORDS) {
    const createdAt = daysAgo(r.daysAgoCreated);
    const record = await prisma.medicalRecord.create({
      data: {
        patientId: patientIds.get(r.patient)!,
        uploadedById: staffIds.get(r.uploadedBy)!,
        assignmentId: assignmentIds.get(`${r.patient}:${r.uploadedBy}`) ?? null,
        institutionId: institution.id,
        recordType: r.recordType,
        recordDate: createdAt,
        createdAt,
      },
    });

    switch (r.recordType) {
      case 'LAB_RESULT':
        await prisma.labResultDetail.create({
          data: {
            recordId: record.id,
            testName: r.labResult!.testName,
            testDate: createdAt,
            labName: r.labResult!.labName,
          },
        });
        break;
      case 'CONSULTATION':
        await prisma.consultationDetail.create({
          data: {
            recordId: record.id,
            chiefComplaint: r.consultation!.chiefComplaint,
            findings: r.consultation!.findings,
            diagnosis: r.consultation!.diagnosis,
            plan: r.consultation!.plan,
            followUpDate: addDays(createdAt, r.consultation!.followUpInDays),
          },
        });
        break;
      case 'SCAN':
        await prisma.scanDetail.create({
          data: {
            recordId: record.id,
            modalityType: r.scan!.modalityType,
            bodyPart: r.scan!.bodyPart,
            radiologistName: r.scan!.radiologistName,
          },
        });
        break;
      case 'PRESCRIPTION': {
        const prescription = await prisma.prescription.create({
          data: { recordId: record.id, prescriptionDate: createdAt },
        });
        for (const item of r.prescriptionItems!) {
          await prisma.prescriptionItem.create({
            data: { prescriptionId: prescription.id, ...item },
          });
        }
        break;
      }
      case 'VACCINATION':
        await prisma.vaccinationDetail.create({
          data: {
            recordId: record.id,
            vaccineName: r.vaccination!.vaccineName,
            doseNumber: r.vaccination!.doseNumber,
            administeredDate: createdAt,
            nextDoseDate: addDays(createdAt, r.vaccination!.nextDoseInDays),
          },
        });
        break;
    }
  }

  console.log(
    `  Created institution "${institution.name}" with ${MAIN_CHARACTERS.length} staff, ${PATIENTS.length} patients, ${RECORDS.length} medical records.`,
  );
  console.log(
    '  Log in as any of: ' +
      MAIN_CHARACTERS.map((c) => `${c.fullName} <${c.email}>`).join(', '),
  );
}
