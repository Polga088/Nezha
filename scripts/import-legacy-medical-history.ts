import 'dotenv/config';

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  type ConsultationSource,
  type ConsultationType,
  type Patient,
  type Role,
  type User,
} from '../src/generated/prisma/client';

type Mode = 'analyze' | 'dry-run' | 'import';

type CliOptions = {
  file: string;
  mode: Mode;
  outputDir: string;
  limit: number | null;
  patientSourceId: string | null;
  targetDoctorId: string | null;
  expectedCount: number | null;
};

type LegacyMedicalHistoryRow = {
  sourceNoteId: string;
  sourcePatientId: string | null;
  sourceDoctorId: string | null;
  title: string | null;
  descriptionHtml: string | null;
  descriptionText: string | null;
  patientName: string | null;
  patientPhone: string | null;
  patientAddress: string | null;
  historicalDate: Date | null;
  registrationTime: Date | null;
};

type SqlInsertBlock = {
  columnsSql: string;
  valuesSql: string;
};

type ParserStats = {
  insertBlocksDetected: number;
  totalTuplesDetected: number;
  validRows: number;
  rejectedRows: number;
  distinctSourcePatientIds: number;
  firstSourceNoteId: string | null;
  lastSourceNoteId: string | null;
  rejectedReasons: Record<string, number>;
};

type ParsedMedicalHistoryDump = {
  rows: LegacyMedicalHistoryRow[];
  stats: ParserStats;
};

type PatientMatch =
  | { status: 'MATCHED'; patient: Patient; method: MatchMethod }
  | { status: 'AMBIGUOUS'; candidates: Patient[]; method: MatchMethod; reason: string }
  | { status: 'UNMATCHED'; method: 'UNMATCHED'; reason: string };

type MatchMethod =
  | 'EXPLICIT_SOURCE_PATIENT_ID'
  | 'PHONE_EXACT'
  | 'NAME_PHONE_EXACT'
  | 'NAME_ONLY_AMBIGUOUS'
  | 'UNMATCHED';

type ReportStatus =
  | 'VALID'
  | 'SKIPPED_ALREADY_IMPORTED'
  | 'SKIPPED_DB_DUPLICATE'
  | 'DRY_RUN_READY'
  | 'IMPORTED'
  | 'AMBIGUOUS'
  | 'UNMATCHED'
  | 'INVALID'
  | 'ERROR';

type ReportRow = {
  sourceNoteId: string;
  sourcePatientId: string | null;
  sourceDoctorId: string | null;
  patientNezhaId: string | null;
  matchingMethod: string;
  historicalDate: string | null;
  status: ReportStatus;
  error: string | null;
  title: string | null;
  patientName: string | null;
  patientPhone: string | null;
};

type ImportedNoteRecord = {
  sourceNoteId: string;
  sourcePatientId: string | null;
  patientNezhaId: string;
  consultationId: string;
  targetDoctorId: string | null;
  historicalDate: string;
  importedAt: string;
};

type ImportedNotesFile = {
  version: 1;
  imported: ImportedNoteRecord[];
};

type PatientIndex = {
  explicitSourcePatientIdToNezhaId: Map<string, string>;
  byPhone: Map<string, Patient[]>;
  byName: Map<string, Patient[]>;
  byNamePhone: Map<string, Patient[]>;
};

const LEGACY_NOTE_PREFIX = '[legacy:medical_history:';
const CONSULTATION_TYPE: ConsultationType = 'CONSULTATION';
const CONSULTATION_SOURCE: ConsultationSource = 'OUT_OF_APPOINTMENT';

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    file: '',
    mode: 'analyze',
    outputDir: './migration-output',
    limit: null,
    patientSourceId: null,
    targetDoctorId: null,
    expectedCount: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--file' && next) {
      options.file = next;
      i += 1;
    } else if (arg === '--mode' && next) {
      if (!['analyze', 'dry-run', 'import'].includes(next)) {
        throw new Error('--mode doit valoir analyze, dry-run ou import');
      }
      options.mode = next as Mode;
      i += 1;
    } else if (arg === '--output-dir' && next) {
      options.outputDir = next;
      i += 1;
    } else if (arg === '--limit' && next) {
      const limit = Number(next);
      if (!Number.isInteger(limit) || limit <= 0) {
        throw new Error('--limit doit être un entier positif');
      }
      options.limit = limit;
      i += 1;
    } else if (arg === '--patient-source-id' && next) {
      options.patientSourceId = next;
      i += 1;
    } else if (arg === '--target-doctor-id' && next) {
      options.targetDoctorId = next;
      i += 1;
    } else if (arg === '--expected-count' && next) {
      const expectedCount = Number(next);
      if (!Number.isInteger(expectedCount) || expectedCount <= 0) {
        throw new Error('--expected-count doit être un entier positif');
      }
      options.expectedCount = expectedCount;
      i += 1;
    } else {
      throw new Error(`Argument inconnu ou incomplet: ${arg}`);
    }
  }

  if (!options.file) {
    throw new Error('--file est obligatoire');
  }
  if ((options.mode === 'dry-run' || options.mode === 'import') && !options.targetDoctorId) {
    throw new Error('--target-doctor-id est obligatoire en dry-run et import');
  }

  return options;
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL doit être défini');
  }
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

function splitSqlValuesTuples(valuesSql: string): string[][] {
  const tuples: string[][] = [];
  let currentTuple: string[] | null = null;
  let currentValue = '';
  let insideString = false;
  let escaped = false;
  let parenthesisDepth = 0;

  for (let i = 0; i < valuesSql.length; i += 1) {
    const char = valuesSql[i];
    const next = valuesSql[i + 1];

    if (insideString) {
      currentValue += char;
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === "'" && next === "'") {
        currentValue += next;
        i += 1;
      } else if (char === "'") {
        insideString = false;
      }
      continue;
    }

    if (char === "'") {
      insideString = true;
      currentValue += char;
      continue;
    }

    if (char === '(') {
      if (parenthesisDepth === 0) {
        currentTuple = [];
        currentValue = '';
      } else {
        currentValue += char;
      }
      parenthesisDepth += 1;
      continue;
    }

    if (char === ')') {
      parenthesisDepth -= 1;
      if (parenthesisDepth === 0) {
        currentTuple?.push(currentValue.trim());
        if (currentTuple) tuples.push(currentTuple);
        currentTuple = null;
        currentValue = '';
      } else {
        currentValue += char;
      }
      continue;
    }

    if (char === ',' && parenthesisDepth === 1) {
      currentTuple?.push(currentValue.trim());
      currentValue = '';
      continue;
    }

    if (parenthesisDepth > 0) {
      currentValue += char;
    }
  }

  return tuples;
}

function unescapeSqlString(value: string): string | null {
  const trimmed = value.trim();
  if (/^NULL$/i.test(trimmed)) return null;
  if (!trimmed.startsWith("'") || !trimmed.endsWith("'")) return trimmed;
  const inner = trimmed.slice(1, -1);
  return inner
    .replace(/\\r/g, '\r')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\0/g, '\0')
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
    .replace(/''/g, "'");
}

function parseUnixTimestamp(raw: string | null): Date | null {
  const value = raw?.trim();
  if (!value) return null;
  if (!/^-?\d+(\.\d+)?$/.test(value)) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  const milliseconds = numeric > 10_000_000_000 ? numeric : numeric * 1000;
  const date = new Date(milliseconds);
  return Number.isNaN(date.getTime()) ? null : date;
}

function decodeHtmlEntities(value: string): string {
  const named: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
  };

  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity: string) => {
    if (entity.startsWith('#x') || entity.startsWith('#X')) {
      const code = Number.parseInt(entity.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    if (entity.startsWith('#')) {
      const code = Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return named[entity] ?? match;
  });
}

function cleanHtmlDescription(html: string | null): string | null {
  if (!html) return null;
  const withLineBreaks = html
    .replace(/\r\n/g, '\n')
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\s*\/p\s*>/gi, '\n')
    .replace(/<\s*p\b[^>]*>/gi, '')
    .replace(/<\s*\/div\s*>/gi, '\n')
    .replace(/<\s*div\b[^>]*>/gi, '')
    .replace(/<[^>]+>/g, '');

  const decoded = decodeHtmlEntities(withLineBreaks)
    .replace(/\u00a0/g, ' ')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return decoded || null;
}

function findClosingParenthesis(sql: string, openIndex: number): number {
  let insideString = false;
  let escaped = false;
  let parenthesisDepth = 0;

  for (let i = openIndex; i < sql.length; i += 1) {
    const char = sql[i];
    const next = sql[i + 1];

    if (insideString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === "'" && next === "'") {
        i += 1;
      } else if (char === "'") {
        insideString = false;
      }
      continue;
    }

    if (char === "'") {
      insideString = true;
      continue;
    }
    if (char === '(') parenthesisDepth += 1;
    if (char === ')') {
      parenthesisDepth -= 1;
      if (parenthesisDepth === 0) return i;
    }
  }

  return -1;
}

function findSqlStatementEnd(sql: string, startIndex: number): number {
  let insideString = false;
  let escaped = false;
  let parenthesisDepth = 0;

  for (let i = startIndex; i < sql.length; i += 1) {
    const char = sql[i];
    const next = sql[i + 1];

    if (insideString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === "'" && next === "'") {
        i += 1;
      } else if (char === "'") {
        insideString = false;
      }
      continue;
    }

    if (char === "'") {
      insideString = true;
      continue;
    }
    if (char === '(') parenthesisDepth += 1;
    if (char === ')') parenthesisDepth = Math.max(0, parenthesisDepth - 1);
    if (char === ';' && parenthesisDepth === 0) return i;
  }

  return -1;
}

function parseColumnList(columnsSql: string): string[] {
  const columns: string[] = [];
  let current = '';
  let insideIdentifier = false;

  for (let i = 0; i < columnsSql.length; i += 1) {
    const char = columnsSql[i];
    const next = columnsSql[i + 1];

    if (insideIdentifier) {
      if (char === '`' && next === '`') {
        current += '`';
        i += 1;
      } else if (char === '`') {
        insideIdentifier = false;
      } else {
        current += char;
      }
      continue;
    }

    if (char === '`') {
      insideIdentifier = true;
      continue;
    }
    if (char === ',') {
      const column = current.trim();
      if (column) columns.push(column);
      current = '';
      continue;
    }
    current += char;
  }

  const column = current.trim();
  if (column) columns.push(column);
  return columns;
}

function extractMedicalHistoryInsertBlocks(sql: string): SqlInsertBlock[] {
  const blocks: SqlInsertBlock[] = [];
  const insertRegex = /INSERT\s+INTO\s+`medical_history`\s*\(/gi;
  let match: RegExpExecArray | null;

  while ((match = insertRegex.exec(sql))) {
    const columnsOpenIndex = insertRegex.lastIndex - 1;
    const columnsCloseIndex = findClosingParenthesis(sql, columnsOpenIndex);
    if (columnsCloseIndex === -1) {
      throw new Error(`INSERT medical_history invalide: parenthèse de colonnes non fermée à l'index ${match.index}`);
    }

    const afterColumnsIndex = columnsCloseIndex + 1;
    const valuesMatch = /^\s*VALUES\b/i.exec(sql.slice(afterColumnsIndex));
    if (!valuesMatch) {
      insertRegex.lastIndex = afterColumnsIndex;
      continue;
    }

    const valuesStartIndex = afterColumnsIndex + valuesMatch[0].length;
    const statementEndIndex = findSqlStatementEnd(sql, valuesStartIndex);
    if (statementEndIndex === -1) {
      throw new Error(`INSERT medical_history invalide: point-virgule final introuvable à l'index ${match.index}`);
    }

    blocks.push({
      columnsSql: sql.slice(columnsOpenIndex + 1, columnsCloseIndex),
      valuesSql: sql.slice(valuesStartIndex, statementEndIndex),
    });
    insertRegex.lastIndex = statementEndIndex + 1;
  }

  return blocks;
}

function incrementReason(rejectedReasons: Record<string, number>, reason: string): void {
  rejectedReasons[reason] = (rejectedReasons[reason] ?? 0) + 1;
}

function parseMedicalHistoryDump(sql: string): ParsedMedicalHistoryDump {
  const blocks = extractMedicalHistoryInsertBlocks(sql);
  const rows: LegacyMedicalHistoryRow[] = [];
  const rejectedReasons: Record<string, number> = {};
  let totalTuplesDetected = 0;
  let firstSourceNoteId: string | null = null;
  let lastSourceNoteId: string | null = null;
  const sourcePatientIds = new Set<string>();

  for (const block of blocks) {
    const columns = parseColumnList(block.columnsSql);
    const tuples = splitSqlValuesTuples(block.valuesSql);
    totalTuplesDetected += tuples.length;

    for (const tuple of tuples) {
      if (tuple.length !== columns.length) {
        incrementReason(
          rejectedReasons,
          `Nombre de valeurs invalide: ${tuple.length} au lieu de ${columns.length}`,
        );
        continue;
      }

      const record = new Map<string, string | null>();
      columns.forEach((column, index) => {
        record.set(column, unescapeSqlString(tuple[index] ?? 'NULL'));
      });

      const sourceNoteId = String(record.get('id') ?? '').trim();
      if (!sourceNoteId) {
        incrementReason(rejectedReasons, 'ID source absent');
        continue;
      }

      const sourcePatientId = emptyToNull(record.get('patient_id') ?? null);
      const descriptionHtml = record.get('description') ?? null;
      const historicalDate = parseUnixTimestamp(record.get('date') ?? null);

      if (!firstSourceNoteId) firstSourceNoteId = sourceNoteId;
      lastSourceNoteId = sourceNoteId;
      if (sourcePatientId) sourcePatientIds.add(sourcePatientId);

      rows.push({
        sourceNoteId,
        sourcePatientId,
        sourceDoctorId: emptyToNull(record.get('doctor_id') ?? null),
        title: emptyToNull(record.get('title') ?? null),
        descriptionHtml,
        descriptionText: cleanHtmlDescription(descriptionHtml),
        patientName: emptyToNull(record.get('patient_name') ?? null),
        patientPhone: emptyToNull(record.get('patient_phone') ?? null),
        patientAddress: emptyToNull(record.get('patient_address') ?? null),
        historicalDate,
        registrationTime: parseUnixTimestamp(record.get('registration_time') ?? null),
      });
    }
  }

  return {
    rows,
    stats: {
      insertBlocksDetected: blocks.length,
      totalTuplesDetected,
      validRows: rows.length,
      rejectedRows: totalTuplesDetected - rows.length,
      distinctSourcePatientIds: sourcePatientIds.size,
      firstSourceNoteId,
      lastSourceNoteId,
      rejectedReasons,
    },
  };
}

function validateParserStats(stats: ParserStats, expectedCount: number | null): void {
  const errors: string[] = [];

  if (stats.insertBlocksDetected === 0) {
    errors.push('Aucun INSERT INTO `medical_history` détecté');
  }
  if (stats.totalTuplesDetected < 100) {
    errors.push(`Nombre de tuples insuffisant: ${stats.totalTuplesDetected} détecté(s), minimum attendu 100`);
  }
  if (stats.totalTuplesDetected > 0 && stats.rejectedRows > stats.totalTuplesDetected / 2) {
    errors.push(`Majorité de tuples rejetée: ${stats.rejectedRows}/${stats.totalTuplesDetected}`);
  }
  if (expectedCount !== null && stats.validRows !== expectedCount) {
    errors.push(`--expected-count mismatch: ${stats.validRows} ligne(s) valide(s) parsée(s), attendu ${expectedCount}`);
  }

  if (errors.length > 0) {
    throw new Error(`Validation parseur échouée:\n- ${errors.join('\n- ')}`);
  }
}

function emptyToNull(value: string | null): string | null {
  const text = value?.trim();
  return text ? text : null;
}

function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeName(value: string | null): string | null {
  if (!value) return null;
  const normalized = stripDiacritics(value)
    .toUpperCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized || null;
}

function normalizePhone(value: string | null): string | null {
  if (!value) return null;
  let digits = value.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (digits.startsWith('212')) digits = `0${digits.slice(3)}`;
  digits = digits.replace(/^00/, '');
  if (digits.length > 10 && digits.startsWith('0')) {
    digits = digits.slice(-10);
  }
  return digits || null;
}

function addToIndex<T>(map: Map<string, T[]>, key: string | null, value: T): void {
  if (!key) return;
  const existing = map.get(key) ?? [];
  existing.push(value);
  map.set(key, existing);
}

async function loadExplicitPatientMap(outputDir: string): Promise<Map<string, string>> {
  const mapPath = path.join(outputDir, 'patient-id-map.json');
  if (!existsSync(mapPath)) return new Map();

  const raw = await readFile(mapPath, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  const result = new Map<string, string>();

  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>;
        const source = record.sourcePatientId ?? record.source_patient_id ?? record.legacyPatientId;
        const target = record.patientNezhaId ?? record.patientId ?? record.nezhaPatientId;
        if (source != null && typeof target === 'string') {
          result.set(String(source), target);
        }
      }
    }
  } else if (parsed && typeof parsed === 'object') {
    for (const [source, target] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof target === 'string') result.set(source, target);
    }
  }

  return result;
}

function buildPatientIndex(patients: Patient[], explicitMap: Map<string, string>): PatientIndex {
  const byPhone = new Map<string, Patient[]>();
  const byName = new Map<string, Patient[]>();
  const byNamePhone = new Map<string, Patient[]>();

  for (const patient of patients) {
    const phone = normalizePhone(patient.tel ?? null);
    const fullName = normalizeName(`${patient.nom ?? ''} ${patient.prenom ?? ''}`);
    addToIndex(byPhone, phone, patient);
    addToIndex(byName, fullName, patient);
    addToIndex(byNamePhone, fullName && phone ? `${fullName}|${phone}` : null, patient);
  }

  return {
    explicitSourcePatientIdToNezhaId: explicitMap,
    byPhone,
    byName,
    byNamePhone,
  };
}

function uniquePatients(patients: Patient[]): Patient[] {
  return [...new Map(patients.map((patient) => [patient.id, patient])).values()];
}

function matchPatient(row: LegacyMedicalHistoryRow, index: PatientIndex): PatientMatch {
  if (row.sourcePatientId) {
    const mappedId = index.explicitSourcePatientIdToNezhaId.get(row.sourcePatientId);
    if (mappedId) {
      const patient = [...index.byName.values()].flat().find((candidate) => candidate.id === mappedId);
      if (patient) {
        return { status: 'MATCHED', patient, method: 'EXPLICIT_SOURCE_PATIENT_ID' };
      }
    }
  }

  const phone = normalizePhone(row.patientPhone);
  const name = normalizeName(row.patientName);

  if (phone) {
    const phoneMatches = uniquePatients(index.byPhone.get(phone) ?? []);
    if (phoneMatches.length === 1) {
      return { status: 'MATCHED', patient: phoneMatches[0], method: 'PHONE_EXACT' };
    }
    if (phoneMatches.length > 1 && name) {
      const namePhoneMatches = uniquePatients(index.byNamePhone.get(`${name}|${phone}`) ?? []);
      if (namePhoneMatches.length === 1) {
        return { status: 'MATCHED', patient: namePhoneMatches[0], method: 'NAME_PHONE_EXACT' };
      }
      return {
        status: 'AMBIGUOUS',
        candidates: namePhoneMatches.length > 0 ? namePhoneMatches : phoneMatches,
        method: 'NAME_PHONE_EXACT',
        reason: 'Plusieurs patients correspondent au téléphone et/ou au nom',
      };
    }
  }

  if (name) {
    const nameMatches = uniquePatients(index.byName.get(name) ?? []);
    if (nameMatches.length === 1) {
      return {
        status: 'AMBIGUOUS',
        candidates: nameMatches,
        method: 'NAME_ONLY_AMBIGUOUS',
        reason: 'Correspondance nom/prénom uniquement: validation manuelle requise',
      };
    }
    if (nameMatches.length > 1) {
      return {
        status: 'AMBIGUOUS',
        candidates: nameMatches,
        method: 'NAME_ONLY_AMBIGUOUS',
        reason: 'Plusieurs patients portent ce nom normalisé',
      };
    }
  }

  return { status: 'UNMATCHED', method: 'UNMATCHED', reason: 'Aucun patient correspondant' };
}

async function readImportedNotes(outputDir: string): Promise<ImportedNotesFile> {
  const filePath = path.join(outputDir, 'imported-notes.json');
  if (!existsSync(filePath)) return { version: 1, imported: [] };
  const raw = await readFile(filePath, 'utf8');
  const parsed = JSON.parse(raw) as Partial<ImportedNotesFile>;
  return {
    version: 1,
    imported: Array.isArray(parsed.imported) ? parsed.imported : [],
  };
}

async function writeImportedNotes(outputDir: string, imported: ImportedNotesFile): Promise<void> {
  await writeFile(path.join(outputDir, 'imported-notes.json'), `${JSON.stringify(imported, null, 2)}\n`, 'utf8');
}

function buildLegacyMarker(sourceNoteId: string): string {
  return `${LEGACY_NOTE_PREFIX}${sourceNoteId}]`;
}

function buildConsultationPayload(row: LegacyMedicalHistoryRow, targetDoctorId: string | null) {
  const title = row.title?.trim() || 'Note médicale historique';
  const body = row.descriptionText?.trim() || '(description vide)';
  const metadata = [
    '',
    '---',
    buildLegacyMarker(row.sourceNoteId),
    row.sourcePatientId ? `patient_source_id: ${row.sourcePatientId}` : null,
    row.sourceDoctorId ? `doctor_source_id: ${row.sourceDoctorId}` : null,
    row.patientPhone ? `patient_phone_source: ${row.patientPhone}` : null,
    row.patientAddress ? `patient_address_source: ${row.patientAddress}` : null,
    row.registrationTime ? `registration_time_source: ${row.registrationTime.toISOString()}` : null,
  ].filter(Boolean);

  return {
    type: CONSULTATION_TYPE,
    motif: title,
    diagnostic: null,
    notes: [body, ...metadata].join('\n'),
    source: CONSULTATION_SOURCE,
    authorId: targetDoctorId,
    date: row.historicalDate ?? new Date(0),
  };
}

async function findDbDuplicate(
  prisma: PrismaClient,
  row: LegacyMedicalHistoryRow,
  patientId: string,
  targetDoctorId: string | null
): Promise<string | null> {
  const marker = buildLegacyMarker(row.sourceNoteId);
  const duplicate = await prisma.consultation.findFirst({
    where: {
      patientId,
      ...(targetDoctorId ? { authorId: targetDoctorId } : {}),
      notes: { contains: marker },
    },
    select: { id: true },
  });
  return duplicate?.id ?? null;
}

function toCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows: ReportRow[]): string {
  const headers: (keyof ReportRow)[] = [
    'sourceNoteId',
    'sourcePatientId',
    'sourceDoctorId',
    'patientNezhaId',
    'matchingMethod',
    'historicalDate',
    'status',
    'error',
    'title',
    'patientName',
    'patientPhone',
  ];
  return [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => toCsvValue(row[header])).join(',')),
  ].join('\n') + '\n';
}

async function writeReports(outputDir: string, rows: ReportRow[], summary: Record<string, unknown>): Promise<void> {
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outputDir, 'report.csv'), toCsv(rows), 'utf8');
  await writeFile(path.join(outputDir, 'errors.csv'), toCsv(rows.filter((row) => row.status === 'ERROR' || row.status === 'INVALID')), 'utf8');
  await writeFile(path.join(outputDir, 'unmatched-patients.csv'), toCsv(rows.filter((row) => row.status === 'UNMATCHED')), 'utf8');
  await writeFile(path.join(outputDir, 'ambiguous-patients.csv'), toCsv(rows.filter((row) => row.status === 'AMBIGUOUS')), 'utf8');
}

function createReportRow(
  row: LegacyMedicalHistoryRow,
  match: PatientMatch | null,
  status: ReportStatus,
  error: string | null
): ReportRow {
  return {
    sourceNoteId: row.sourceNoteId,
    sourcePatientId: row.sourcePatientId,
    sourceDoctorId: row.sourceDoctorId,
    patientNezhaId: match?.status === 'MATCHED' ? match.patient.id : null,
    matchingMethod: match?.method ?? 'UNMATCHED',
    historicalDate: row.historicalDate?.toISOString() ?? null,
    status,
    error,
    title: row.title,
    patientName: row.patientName,
    patientPhone: row.patientPhone,
  };
}

async function validateTargetDoctor(prisma: PrismaClient, targetDoctorId: string | null): Promise<User | null> {
  if (!targetDoctorId) return null;
  const doctor = await prisma.user.findUnique({ where: { id: targetDoctorId } });
  if (!doctor) {
    throw new Error(`target doctor introuvable: ${targetDoctorId}`);
  }
  if (doctor.role !== 'DOCTOR' && doctor.role !== 'ADMIN') {
    throw new Error(`target doctor invalide: role ${doctor.role}; attendu DOCTOR ou ADMIN`);
  }
  if (!doctor.isActive) {
    throw new Error(`target doctor inactif: ${targetDoctorId}`);
  }
  return doctor;
}

function summarize(rows: ReportRow[], extra: Record<string, unknown>) {
  const statusCounts = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {});

  return {
    ...extra,
    notesTotalInScope: rows.length,
    notesValid: rows.filter((row) => ['VALID', 'DRY_RUN_READY', 'IMPORTED'].includes(row.status)).length,
    notesAmbiguous: rows.filter((row) => row.status === 'AMBIGUOUS').length,
    notesUnmatched: rows.filter((row) => row.status === 'UNMATCHED').length,
    statusCounts,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(options.file);
  const outputDir = path.resolve(options.outputDir);
  const sql = await readFile(inputPath, 'utf8');
  const parsedDump = parseMedicalHistoryDump(sql);
  validateParserStats(parsedDump.stats, options.expectedCount);

  const parsedRows = parsedDump.rows
    .filter((row) => (options.patientSourceId ? row.sourcePatientId === options.patientSourceId : true))
    .filter((row) => row.sourceNoteId);
  const rows = options.limit ? parsedRows.slice(0, options.limit) : parsedRows;
  const sourcePatientIdsInScope = new Set(rows.map((row) => row.sourcePatientId).filter(Boolean));

  await mkdir(outputDir, { recursive: true });

  const prisma = createPrismaClient();
  const reportRows: ReportRow[] = [];
  const importedNotes = await readImportedNotes(outputDir);
  const importedBySourceId = new Map(importedNotes.imported.map((item) => [item.sourceNoteId, item]));

  try {
    const [patients, users, explicitMap] = await Promise.all([
      prisma.patient.findMany(),
      prisma.user.findMany({ orderBy: { nom: 'asc' } }),
      loadExplicitPatientMap(outputDir),
    ]);
    const targetDoctor = await validateTargetDoctor(prisma, options.targetDoctorId);
    const patientIndex = buildPatientIndex(patients, explicitMap);

    for (const row of rows) {
      const imported = importedBySourceId.get(row.sourceNoteId);
      const match = matchPatient(row, patientIndex);

      if (!row.historicalDate) {
        reportRows.push(createReportRow(row, match, 'INVALID', 'Date historique absente ou invalide'));
        continue;
      }
      if (!row.descriptionText && !row.title) {
        reportRows.push(createReportRow(row, match, 'INVALID', 'Titre et description vides'));
        continue;
      }
      if (match.status === 'AMBIGUOUS') {
        reportRows.push(createReportRow(row, match, 'AMBIGUOUS', match.reason));
        continue;
      }
      if (match.status === 'UNMATCHED') {
        reportRows.push(createReportRow(row, match, 'UNMATCHED', match.reason));
        continue;
      }
      if (imported) {
        reportRows.push(createReportRow(row, match, 'SKIPPED_ALREADY_IMPORTED', `Déjà importé: ${imported.consultationId}`));
        continue;
      }

      const duplicateId = await findDbDuplicate(prisma, row, match.patient.id, options.targetDoctorId);
      if (duplicateId) {
        reportRows.push(createReportRow(row, match, 'SKIPPED_DB_DUPLICATE', `Doublon DB détecté: ${duplicateId}`));
        continue;
      }

      if (options.mode === 'analyze') {
        reportRows.push(createReportRow(row, match, 'VALID', null));
        continue;
      }

      if (options.mode === 'dry-run') {
        reportRows.push(createReportRow(row, match, 'DRY_RUN_READY', null));
        continue;
      }

      try {
        const created = await prisma.$transaction(async (tx) => {
          const duplicateInsideTx = await tx.consultation.findFirst({
            where: {
              patientId: match.patient.id,
              ...(options.targetDoctorId ? { authorId: options.targetDoctorId } : {}),
              notes: { contains: buildLegacyMarker(row.sourceNoteId) },
            },
            select: { id: true },
          });
          if (duplicateInsideTx) return duplicateInsideTx;

          return tx.consultation.create({
            data: {
              patientId: match.patient.id,
              ...buildConsultationPayload(row, targetDoctor?.id ?? null),
            },
            select: { id: true },
          });
        });

        importedNotes.imported.push({
          sourceNoteId: row.sourceNoteId,
          sourcePatientId: row.sourcePatientId,
          patientNezhaId: match.patient.id,
          consultationId: created.id,
          targetDoctorId: targetDoctor?.id ?? null,
          historicalDate: row.historicalDate.toISOString(),
          importedAt: new Date().toISOString(),
        });
        importedBySourceId.set(row.sourceNoteId, importedNotes.imported[importedNotes.imported.length - 1]);
        await writeImportedNotes(outputDir, importedNotes);
        reportRows.push(createReportRow(row, match, 'IMPORTED', null));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        reportRows.push(createReportRow(row, match, 'ERROR', message));
      }
    }

    const doctorSummary = users
      .filter((user) => user.role === 'DOCTOR' || user.role === 'ADMIN')
      .map((user) => ({ id: user.id, nom: user.nom, email: user.email, role: user.role as Role, isActive: user.isActive }));

    const summary = summarize(reportRows, {
      mode: options.mode,
      sourceFile: inputPath,
      outputDir,
      patientsInNezha: patients.length,
      sourceUniquePatients: sourcePatientIdsInScope.size,
      sourceNotesParsed: parsedRows.length,
      sourceNotesInScope: rows.length,
      sourceUniquePatientsParsedTotal: parsedDump.stats.distinctSourcePatientIds,
      parserStats: parsedDump.stats,
      explicitPatientMappingsLoaded: explicitMap.size,
      targetDoctor: targetDoctor
        ? { id: targetDoctor.id, nom: targetDoctor.nom, email: targetDoctor.email, role: targetDoctor.role }
        : null,
      availableDoctors: doctorSummary,
    });

    await writeReports(outputDir, reportRows, summary);
    await writeImportedNotes(outputDir, importedNotes);

    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
