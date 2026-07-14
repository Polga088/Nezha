import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { AssuranceType, Prisma } from '@/generated/prisma/client';

import { verifyJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseOptionalFloat, parseSexe } from '@/lib/patient-fields';
import {
  PATIENT_IMPORT_INSURANCE_DEFINITIONS,
  normalizeEmptyValue,
  normalizeFreeTextValue,
  normalizeNominalField,
  normalizePhoneValue,
  parseImportDateValue,
  parsePatientImportRows,
  resolveInsuranceDefinition,
  resolvePatientIdentityDecision,
  validatePatientImportFileSize,
  type PatientImportMode,
  type PatientImportReportRow,
  type PatientImportSummary,
  type ParsedPatientRow,
} from '@/lib/patient-import';

async function getUser(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  return await verifyJwt(token);
}

function normKey(k: string): string {
  return k
    .trim()
    .toLowerCase()
    .replace(/[\s._/-]+/g, '');
}

function cell(row: ParsedPatientRow, ...aliases: string[]): unknown {
  for (const [key, val] of Object.entries(row)) {
    const nk = normKey(key);
    for (const alias of aliases) {
      if (nk === normKey(alias)) return val;
    }
  }
  return undefined;
}

function normalizeCin(raw: unknown): string | null {
  const text = normalizeEmptyValue(raw);
  return text === null ? null : text.trim().toUpperCase();
}

function normalizeEmail(raw: unknown): string | null {
  const text = normalizeEmptyValue(raw);
  return text === null ? null : text.trim().toLowerCase();
}

function normalizeGroupeSanguin(raw: unknown): string | null {
  const text = normalizeEmptyValue(raw);
  if (text === null) return null;
  if (text.trim().toUpperCase() === 'INCONNU') return null;
  return text.trim().toUpperCase();
}

function normalizeMode(raw: unknown): PatientImportMode {
  const value = String(raw ?? 'SKIP').trim().toUpperCase();
  if (value === 'UPDATE' || value === 'CREATE_ONLY' || value === 'SKIP') return value;
  return 'SKIP';
}

const YEAR_ONLY_RE = /^\d{4}$/;

function isPrismaUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === 'P2002'
  );
}

function assureEnumForCode(code: string): AssuranceType {
  switch (code) {
    case 'AUCUNE':
    case 'CNSS':
    case 'CNOPS':
    case 'FAR':
    case 'RAMID':
    case 'MUTUELLE_PRIVEE':
    case 'AUTRE':
      return code;
    default:
      return 'AUTRE';
  }
}

function toSafeString(value: unknown): string | null {
  const text = normalizeEmptyValue(value);
  return text === null ? null : text;
}

function buildPatientCreateData(input: {
  id: string | null;
  nom: string;
  prenom: string;
  date_naissance: Date;
  tel: string | null;
  email: string | null;
  adresse: string | null;
  allergies: string | null;
  antecedents: string | null;
  cin: string | null;
  sexe: 'MASCULIN' | 'FEMININ' | null;
  groupeSanguin: string | null;
  taille: number | null;
  poids: number | null;
  assuranceType: AssuranceType;
  insuranceTypeId: string | null;
  matriculeAssurance: string | null;
  createdAt: Date | null;
}): Prisma.PatientUncheckedCreateInput {
  const data: Prisma.PatientUncheckedCreateInput = {
    nom: input.nom,
    prenom: input.prenom,
    date_naissance: input.date_naissance,
    tel: input.tel ?? undefined,
    email: input.email ?? undefined,
    adresse: input.adresse ?? undefined,
    allergies: input.allergies ?? undefined,
    antecedents: input.antecedents ?? undefined,
    cin: input.cin ?? undefined,
    sexe: input.sexe ?? undefined,
    groupeSanguin: input.groupeSanguin ?? undefined,
    taille: input.taille ?? undefined,
    poids: input.poids ?? undefined,
    assuranceType: input.assuranceType,
    insuranceTypeId: input.insuranceTypeId ?? undefined,
    matriculeAssurance: input.matriculeAssurance ?? undefined,
  };
  if (input.id) data.id = input.id;
  if (input.createdAt) data.createdAt = input.createdAt;
  return data;
}

function buildPatientUpdateData(input: {
  nom?: string | null;
  prenom?: string | null;
  date_naissance?: Date | null;
  tel?: string | null;
  email?: string | null;
  adresse?: string | null;
  allergies?: string | null;
  antecedents?: string | null;
  cin?: string | null;
  sexe?: 'MASCULIN' | 'FEMININ' | null;
  groupeSanguin?: string | null;
  taille?: number | null;
  poids?: number | null;
  assuranceType?: AssuranceType | null;
  insuranceTypeId?: string | null;
  matriculeAssurance?: string | null;
}): Prisma.PatientUncheckedUpdateInput {
  const data: Prisma.PatientUncheckedUpdateInput = {};
  if (input.nom !== undefined && input.nom !== null) data.nom = input.nom;
  if (input.prenom !== undefined && input.prenom !== null) data.prenom = input.prenom;
  if (input.date_naissance !== undefined && input.date_naissance !== null) {
    data.date_naissance = input.date_naissance;
  }
  if (input.tel !== undefined && input.tel !== null) data.tel = input.tel;
  if (input.email !== undefined && input.email !== null) data.email = input.email;
  if (input.adresse !== undefined && input.adresse !== null) data.adresse = input.adresse;
  if (input.allergies !== undefined && input.allergies !== null) data.allergies = input.allergies;
  if (input.antecedents !== undefined && input.antecedents !== null) data.antecedents = input.antecedents;
  if (input.cin !== undefined && input.cin !== null) data.cin = input.cin;
  if (input.sexe !== undefined && input.sexe !== null) data.sexe = input.sexe;
  if (input.groupeSanguin !== undefined && input.groupeSanguin !== null) data.groupeSanguin = input.groupeSanguin;
  if (input.taille !== undefined && input.taille !== null) data.taille = input.taille;
  if (input.poids !== undefined && input.poids !== null) data.poids = input.poids;
  if (input.assuranceType !== undefined && input.assuranceType !== null) {
    data.assuranceType = input.assuranceType;
  }
  if (input.insuranceTypeId !== undefined && input.insuranceTypeId !== null) {
    data.insuranceTypeId = input.insuranceTypeId;
  }
  if (input.matriculeAssurance !== undefined && input.matriculeAssurance !== null) {
    data.matriculeAssurance = input.matriculeAssurance;
  }
  return data;
}

function mergedNonEmptyString(existing: string | null | undefined, next: string | null): string | null | undefined {
  if (next === undefined) return undefined;
  if (next === null) return undefined;
  if (next.trim() === '') return undefined;
  return next;
}

function createEmptySummary(): PatientImportSummary {
  return {
    analyzed: 0,
    created: 0,
    updated: 0,
    ignored: 0,
    rejected: 0,
    warnings: 0,
  };
}

function addReportRow(rows: PatientImportReportRow[], row: PatientImportReportRow, summary: PatientImportSummary) {
  rows.push(row);
  if (row.result === 'WARNING') summary.warnings += 1;
  if (row.result === 'CREATED') summary.created += 1;
  if (row.result === 'UPDATED') summary.updated += 1;
  if (row.result === 'SKIPPED') summary.ignored += 1;
  if (row.result === 'REJECTED') summary.rejected += 1;
}

function mapCanonicalCodeToName(code: string): string {
  const def = PATIENT_IMPORT_INSURANCE_DEFINITIONS.find((row) => row.code === code);
  return def?.name ?? code;
}

type ImportedRow = {
  line: number;
  id: string | null;
  nom: string | null;
  prenom: string | null;
  date_naissance: Date | null;
  tel: string | null;
  email: string | null;
  adresse: string | null;
  cin: string | null;
  sexe: 'MASCULIN' | 'FEMININ' | null;
  groupeSanguin: string | null;
  taille: number | null;
  poids: number | null;
  allergies: string | null;
  antecedents: string | null;
  assuranceCode: string | null;
  matriculeAssurance: string | null;
  createdAt: Date | null;
  warnings: { field: string; value: string | null; message: string }[];
  errors: { field: string; value: string | null; message: string }[];
};

function normalizeImportedRow(raw: ParsedPatientRow, line: number): ImportedRow {
  const warnings: ImportedRow['warnings'] = [];
  const errors: ImportedRow['errors'] = [];

  const id = toSafeString(cell(raw, 'id'));
  const nom = normalizeNominalField(cell(raw, 'nom'));
  const prenom = normalizeNominalField(cell(raw, 'prenom'));

  const dateCell = cell(raw, 'date_naissance', 'date naissance');
  const dateParsed = parseImportDateValue(dateCell);
  if (dateCell !== undefined && dateCell !== null && String(dateCell).trim() !== '' && dateParsed.error) {
    errors.push({
      field: 'date_naissance',
      value: String(dateCell),
      message: dateParsed.error,
    });
  }

  const telValue = normalizePhoneValue(cell(raw, 'tel'));
  if (telValue.warning && telValue.value) {
    warnings.push({
      field: 'tel',
      value: telValue.value,
      message: telValue.warning,
    });
  }

  const email = normalizeEmail(cell(raw, 'email'));
  const adresse = normalizeNominalField(cell(raw, 'adresse'));
  const cin = normalizeCin(cell(raw, 'cin'));

  const sexeRaw = cell(raw, 'sexe');
  const sexeParsed = parseSexe(sexeRaw);
  if (normalizeEmptyValue(sexeRaw) !== null && sexeParsed === undefined) {
    errors.push({
      field: 'sexe',
      value: String(sexeRaw),
      message: 'Sexe invalide — attendu : MASCULIN ou FEMININ',
    });
  }

  const groupeSanguin = normalizeGroupeSanguin(cell(raw, 'groupeSanguin', 'groupe_sanguin'));
  const tailleRaw = cell(raw, 'taille');
  const tailleStr = normalizeEmptyValue(tailleRaw);
  const taille = parseOptionalFloat(tailleRaw);
  if (tailleStr !== null && taille === undefined) {
    errors.push({
      field: 'taille',
      value: String(tailleRaw),
      message: 'Taille non numérique',
    });
  }

  const poidsRaw = cell(raw, 'poids');
  const poidsStr = normalizeEmptyValue(poidsRaw);
  const poids = parseOptionalFloat(poidsRaw);
  if (poidsStr !== null && poids === undefined) {
    errors.push({
      field: 'poids',
      value: String(poidsRaw),
      message: 'Poids non numérique',
    });
  }

  const allergies = normalizeFreeTextValue(cell(raw, 'allergies'));
  let antecedents = normalizeFreeTextValue(cell(raw, 'antecedents'));
  const assuranceRaw = normalizeFreeTextValue(cell(raw, 'assuranceType', 'assurance', 'type_assurance'));

  let assuranceCode = resolveInsuranceDefinition(assuranceRaw)?.code ?? null;
  const antecedentsAsInsurance = resolveInsuranceDefinition(antecedents);
  if ((!assuranceCode || assuranceCode === 'AUCUNE') && antecedentsAsInsurance) {
    assuranceCode = antecedentsAsInsurance.code;
    warnings.push({
      field: 'antecedents',
      value: antecedents,
      message: 'Valeur reconnue comme assurance : déplacée vers assuranceType',
    });
    antecedents = null;
  }

  if (assuranceRaw && !assuranceCode) {
    warnings.push({
      field: 'assuranceType',
      value: assuranceRaw,
      message: 'Assurance inconnue : conservée en AUTRE',
    });
    assuranceCode = 'AUTRE';
  }

  if (!assuranceCode) {
    assuranceCode = 'AUCUNE';
  }

  const matriculeAssurance = normalizeFreeTextValue(
    cell(raw, 'matriculeAssurance', 'matricule_assurance', 'matricule')
  );

  const createdAtCell = cell(raw, 'createdAt', 'created_at');
  const createdAtParsed = parseImportDateValue(createdAtCell);
  const createdAt =
    createdAtParsed.value ??
    (normalizeEmptyValue(createdAtCell) === null ? null : null);
  if (
    normalizeEmptyValue(createdAtCell) !== null &&
    createdAtParsed.error &&
    !YEAR_ONLY_RE.test(String(createdAtCell).trim())
  ) {
    warnings.push({
      field: 'createdAt',
      value: String(createdAtCell),
      message: 'createdAt invalide : ignoré',
    });
  }

  return {
    line,
    id,
    nom,
    prenom,
    date_naissance: dateParsed.value,
    tel: telValue.value,
    email,
    adresse,
    cin,
    sexe: sexeParsed ?? null,
    groupeSanguin,
    taille: taille ?? null,
    poids: poids ?? null,
    allergies,
    antecedents,
    assuranceCode,
    matriculeAssurance,
    createdAt,
    warnings,
    errors,
  };
}

function updateMapsFromPatient(
  maps: {
    byId: Map<string, { id: string; cin: string | null; email: string | null }>;
    byCin: Map<string, { id: string; cin: string | null; email: string | null }>;
    byEmail: Map<string, { id: string; cin: string | null; email: string | null }>;
  },
  patient: { id: string; cin: string | null; email: string | null }
) {
  maps.byId.set(patient.id, patient);
  if (patient.cin) maps.byCin.set(patient.cin, patient);
  if (patient.email) maps.byEmail.set(patient.email, patient);
}

function patientRowLabel(row: ImportedRow): { nom: string | null; prenom: string | null } {
  return { nom: row.nom, prenom: row.prenom };
}

function buildRowReport(
  row: ImportedRow,
  result: PatientImportReportRow['result'],
  field: string | null,
  value: string | null,
  message: string
): PatientImportReportRow {
  const label = patientRowLabel(row);
  return {
    line: row.line,
    nom: label.nom,
    prenom: label.prenom,
    result,
    field,
    value,
    message,
  };
}

export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    const ct = request.headers.get('content-type') ?? '';
    if (!ct.includes('multipart/form-data')) {
      return NextResponse.json(
        {
          error: 'Content-Type attendu : multipart/form-data (champ file)',
          errors: ['Envoyez le fichier avec le champ « file » en multipart/form-data'],
        },
        { status: 400 }
      );
    }

    const form = await request.formData();
    const file = form.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        {
          error: 'Fichier manquant (champ file)',
          errors: ['Aucun fichier reçu — utilisez le champ « file »'],
        },
        { status: 400 }
      );
    }

    const mode = normalizeMode(form.get('mode'));
    const fileTooLarge = validatePatientImportFileSize(file.size);
    if (fileTooLarge) {
      return NextResponse.json({ error: fileTooLarge.message }, { status: fileTooLarge.status });
    }
    const rows = await parsePatientImportRows(file);
    const summary = createEmptySummary();
    const reportRows: PatientImportReportRow[] = [];
    const csvHeader = ['ligne', 'nom', 'prenom', 'résultat', 'champ', 'valeur', 'message'];

    if (rows.length === 0) {
      return NextResponse.json(
        {
          error: 'Aucune ligne de données',
          errors: ['Aucune ligne de données après l’en-tête'],
        },
        { status: 400 }
      );
    }

    if (rows.length > 500) {
      return NextResponse.json(
        {
          error: 'Trop de lignes (max 500)',
          errors: [`Nombre de lignes (${rows.length}) supérieur à la limite (500)`],
        },
        { status: 400 }
      );
    }

    const importedRows: ImportedRow[] = rows.map((row, index) => normalizeImportedRow(row, index + 2));
    summary.analyzed = importedRows.length;

    const fatalErrors = importedRows.flatMap((row) =>
      row.errors.map((err) => buildRowReport(row, 'REJECTED', err.field, err.value, err.message))
    );
    for (const err of fatalErrors) {
      addReportRow(reportRows, err, summary);
    }

    const validRows = importedRows.filter((row) => row.errors.length === 0);

    const insuranceDefinitions = new Map<string, { code: string; name: string }>();
    for (const def of PATIENT_IMPORT_INSURANCE_DEFINITIONS) {
      insuranceDefinitions.set(def.code, def);
    }
    for (const row of validRows) {
      if (row.assuranceCode) {
        const resolved = insuranceDefinitions.get(row.assuranceCode);
        if (!resolved) {
          insuranceDefinitions.set(row.assuranceCode, {
            code: row.assuranceCode,
            name: mapCanonicalCodeToName(row.assuranceCode),
          });
        }
      }
    }

    await prisma.insuranceType.createMany({
      data: [...insuranceDefinitions.values()].map((def) => ({
        name: def.name,
        code: def.code,
        description: null,
        isActive: true,
      })),
      skipDuplicates: true,
    });

    const insuranceRows = await prisma.insuranceType.findMany({
      where: { code: { in: [...insuranceDefinitions.keys()] } },
      select: { id: true, code: true, name: true, isActive: true },
    });
    const insuranceByCode = new Map(insuranceRows.map((row) => [row.code, row]));

    const existingPatients = await prisma.patient.findMany({
      select: {
        id: true,
        nom: true,
        prenom: true,
        date_naissance: true,
        tel: true,
        email: true,
        adresse: true,
        allergies: true,
        antecedents: true,
        cin: true,
        sexe: true,
        groupeSanguin: true,
        taille: true,
        poids: true,
        assuranceType: true,
        insuranceTypeId: true,
        matriculeAssurance: true,
        createdAt: true,
      },
    });

    const maps = {
      byId: new Map<string, { id: string; cin: string | null; email: string | null }>(),
      byCin: new Map<string, { id: string; cin: string | null; email: string | null }>(),
      byEmail: new Map<string, { id: string; cin: string | null; email: string | null }>(),
    };
    for (const patient of existingPatients) {
      updateMapsFromPatient(maps, {
        id: patient.id,
        cin: patient.cin ? patient.cin.trim().toUpperCase() : null,
        email: patient.email ? patient.email.trim().toLowerCase() : null,
      });
    }

    const seenInFile = {
      byId: new Map<string, number>(),
      byCin: new Map<string, number>(),
      byEmail: new Map<string, number>(),
    };

    for (const row of validRows) {
      const normalizedId = row.id ? row.id.trim() : null;
      const normalizedCin = row.cin;
      const normalizedEmail = row.email;

      const duplicateHints: Array<{ kind: 'id' | 'cin' | 'email'; key: string; line: number }> = [];
      if (normalizedId && seenInFile.byId.has(normalizedId)) {
        duplicateHints.push({ kind: 'id', key: normalizedId, line: seenInFile.byId.get(normalizedId)! });
      }
      if (normalizedCin && seenInFile.byCin.has(normalizedCin)) {
        duplicateHints.push({ kind: 'cin', key: normalizedCin, line: seenInFile.byCin.get(normalizedCin)! });
      }
      if (normalizedEmail && seenInFile.byEmail.has(normalizedEmail)) {
        duplicateHints.push({ kind: 'email', key: normalizedEmail, line: seenInFile.byEmail.get(normalizedEmail)! });
      }

      const identityDecision = resolvePatientIdentityDecision({
        id: normalizedId ? maps.byId.get(normalizedId) ?? null : null,
        cin: normalizedCin ? maps.byCin.get(normalizedCin) ?? null : null,
        email: normalizedEmail ? maps.byEmail.get(normalizedEmail) ?? null : null,
      });

      if (identityDecision.conflict) {
        addReportRow(
          reportRows,
          buildRowReport(row, 'REJECTED', 'identité', null, identityDecision.conflict.message),
          summary
        );
        continue;
      }

      const existingMatch = identityDecision.selected;
      const inDb = existingMatch !== null;

      if (mode === 'CREATE_ONLY' && (inDb || duplicateHints.length > 0)) {
        const hint = duplicateHints[0] ?? (existingMatch ? { kind: existingMatch.field, key: '', line: row.line } : null);
        addReportRow(
          reportRows,
          buildRowReport(
            row,
            'SKIPPED',
            hint?.kind ?? null,
            hint?.key ?? null,
            hint?.line
              ? `Doublon détecté à la ligne ${hint.line}`
              : inDb
                ? `Doublon déjà présent en base (${existingMatch?.field ?? 'clé inconnue'})`
                : 'Doublon détecté'
          ),
          summary
        );
        continue;
      }

      if (mode === 'SKIP' && (inDb || duplicateHints.length > 0)) {
        const matched = existingMatch;
        const sourceMessage =
          duplicateHints.length > 0
            ? `Doublon dans le fichier importé (ligne ${duplicateHints[0].line})`
            : `Doublon déjà présent en base (${matched?.field ?? 'clé inconnue'})`;
        addReportRow(
          reportRows,
          buildRowReport(row, 'SKIPPED', matched?.field ?? null, matched?.patient.id ?? null, sourceMessage),
          summary
        );
        continue;
      }

      if (!row.nom || !row.prenom || !row.date_naissance) {
        const missing: string[] = [];
        if (!row.nom) missing.push('nom');
        if (!row.prenom) missing.push('prénom');
        if (!row.date_naissance) missing.push('date_naissance');
        addReportRow(
          reportRows,
          buildRowReport(row, 'REJECTED', missing.join(', '), null, `Champs manquants : ${missing.join(', ')}`),
          summary
        );
        continue;
      }

      for (const warning of row.warnings) {
        addReportRow(
          reportRows,
          buildRowReport(row, 'WARNING', warning.field, warning.value, warning.message),
          summary
        );
      }

      const insuranceCode = row.assuranceCode ?? 'AUCUNE';
      const insuranceRow = insuranceByCode.get(insuranceCode) ?? insuranceByCode.get('AUTRE') ?? null;
      const assuranceType = assureEnumForCode(insuranceCode);
      const patientInsuranceTypeId = insuranceRow?.id ?? null;

      const baseData = {
        nom: row.nom.trim(),
        prenom: row.prenom.trim(),
        date_naissance: row.date_naissance,
        tel: row.tel,
        email: row.email,
        adresse: row.adresse,
        allergies: row.allergies,
        antecedents: row.antecedents,
        cin: row.cin,
        sexe: row.sexe,
        groupeSanguin: row.groupeSanguin,
        taille: row.taille,
        poids: row.poids,
        assuranceType,
        insuranceTypeId: patientInsuranceTypeId,
        matriculeAssurance: row.matriculeAssurance,
      };

      try {
        if (existingMatch !== null && mode === 'UPDATE') {
          const current = await prisma.patient.findUnique({
            where: { id: existingMatch.patient.id },
            select: {
              id: true,
              cin: true,
              email: true,
            },
          });
          if (!current) {
            addReportRow(
              reportRows,
              buildRowReport(row, 'REJECTED', null, null, 'Patient existant introuvable'),
              summary
            );
            continue;
          }

          const updateData = buildPatientUpdateData({
            nom: mergedNonEmptyString(undefined, baseData.nom),
            prenom: mergedNonEmptyString(undefined, baseData.prenom),
            date_naissance: baseData.date_naissance,
            tel: baseData.tel,
            email: baseData.email,
            adresse: baseData.adresse,
            allergies: baseData.allergies,
            antecedents: baseData.antecedents,
            cin: baseData.cin,
            sexe: baseData.sexe,
            groupeSanguin: baseData.groupeSanguin,
            taille: baseData.taille,
            poids: baseData.poids,
            assuranceType: baseData.assuranceType,
            insuranceTypeId: baseData.insuranceTypeId,
            matriculeAssurance: baseData.matriculeAssurance,
          });
          const updated = await prisma.patient.update({
            where: { id: existingMatch.patient.id },
            data: updateData,
            select: { id: true, cin: true, email: true },
          });
          updateMapsFromPatient(maps, {
            id: updated.id,
            cin: updated.cin ? updated.cin.trim().toUpperCase() : null,
            email: updated.email ? updated.email.trim().toLowerCase() : null,
          });
          if (normalizedId) seenInFile.byId.set(normalizedId, row.line);
          if (normalizedCin) seenInFile.byCin.set(normalizedCin, row.line);
          if (normalizedEmail) seenInFile.byEmail.set(normalizedEmail, row.line);
          addReportRow(
            reportRows,
            buildRowReport(row, 'UPDATED', 'id', updated.id, 'Patient mis à jour'),
            summary
          );
          continue;
        }

        if (existingMatch !== null && mode !== 'UPDATE') {
          addReportRow(
            reportRows,
            buildRowReport(
              row,
              'SKIPPED',
              existingMatch.field,
              existingMatch.patient.id,
              `Doublon déjà présent en base (${existingMatch.field ?? 'clé inconnue'})`
            ),
            summary
          );
          continue;
        }

        const createData = buildPatientCreateData({
          id: normalizedId,
          nom: baseData.nom,
          prenom: baseData.prenom,
          date_naissance: baseData.date_naissance,
          tel: baseData.tel,
          email: baseData.email,
          adresse: baseData.adresse,
          allergies: baseData.allergies,
          antecedents: baseData.antecedents,
          cin: baseData.cin,
          sexe: baseData.sexe,
          groupeSanguin: baseData.groupeSanguin,
          taille: baseData.taille,
          poids: baseData.poids,
          assuranceType: baseData.assuranceType,
          insuranceTypeId: baseData.insuranceTypeId,
          matriculeAssurance: baseData.matriculeAssurance,
          createdAt: row.createdAt,
        });

        const created = await prisma.patient.create({
          data: createData,
          select: {
            id: true,
            cin: true,
            email: true,
          },
        });

        updateMapsFromPatient(maps, {
          id: created.id,
          cin: created.cin ? created.cin.trim().toUpperCase() : null,
          email: created.email ? created.email.trim().toLowerCase() : null,
        });
        if (normalizedId) seenInFile.byId.set(normalizedId, row.line);
        if (normalizedCin) seenInFile.byCin.set(normalizedCin, row.line);
        if (normalizedEmail) seenInFile.byEmail.set(normalizedEmail, row.line);
        addReportRow(
          reportRows,
          buildRowReport(row, 'CREATED', 'id', created.id, 'Patient créé'),
          summary
        );
      } catch (err) {
        console.error('[import row]', err);
        if (isPrismaUniqueViolation(err)) {
          addReportRow(
            reportRows,
            buildRowReport(
              row,
              'REJECTED',
              'doublon',
              normalizedCin ?? normalizedEmail ?? normalizedId,
              'Doublon de contrainte unique'
            ),
            summary
          );
          continue;
        }
        const message =
          err instanceof Error && err.message
            ? err.message.slice(0, 180)
            : 'Erreur inconnue';
        addReportRow(
          reportRows,
          buildRowReport(row, 'REJECTED', null, null, `Erreur d’enregistrement — ${message}`),
          summary
        );
      }
    }

    const csvRows = [
      csvHeader.join(','),
      ...reportRows.map((row) =>
        [row.line, row.nom ?? '', row.prenom ?? '', row.result, row.field ?? '', row.value ?? '', row.message]
          .map(csvEscapeCell)
          .join(',')
      ),
    ];

    const message = `Import terminé : ${summary.created} créés, ${summary.ignored} ignorés, ${summary.warnings} avertissements, ${summary.rejected} rejetés.`;

    return NextResponse.json({
      summary,
      message,
      mode,
      reportRows,
      reportCsv: `\uFEFF${csvRows.join('\r\n')}\r\n`,
    });
  } catch (e) {
    console.error('[POST /api/patients/import]', e);
    return NextResponse.json({ error: 'Import impossible' }, { status: 500 });
  }
}

function csvEscapeCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? '' : String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}
