import Papa from 'papaparse';
import { unzipSync, strFromU8 } from 'fflate';

export type PatientImportMode = 'SKIP' | 'UPDATE' | 'CREATE_ONLY';

export type PatientImportResultKind = 'CREATED' | 'UPDATED' | 'SKIPPED' | 'REJECTED' | 'WARNING';

export type PatientImportReportRow = {
  line: number;
  nom: string | null;
  prenom: string | null;
  result: PatientImportResultKind;
  field: string | null;
  value: string | null;
  message: string;
};

export type PatientImportSummary = {
  analyzed: number;
  created: number;
  updated: number;
  ignored: number;
  rejected: number;
  warnings: number;
};

export type ParsedPatientRow = Record<string, unknown>;

export const PATIENT_IMPORT_MAX_FILE_BYTES = 10 * 1024 * 1024;

type InsuranceDefinition = {
  code: string;
  name: string;
};

export type PatientIdentityCandidate = {
  id: string;
  cin: string | null;
  email: string | null;
};

export type PatientIdentityMatches = {
  id: PatientIdentityCandidate | null;
  cin: PatientIdentityCandidate | null;
  email: PatientIdentityCandidate | null;
};

export type PatientIdentityDecision =
  | {
      conflict: null;
      selected: {
        field: 'id' | 'cin' | 'email';
        patient: PatientIdentityCandidate;
      } | null;
    }
  | {
      conflict: {
        message: string;
      };
      selected: null;
    };

export const PATIENT_IMPORT_INSURANCE_DEFINITIONS: InsuranceDefinition[] = [
  { code: 'AUCUNE', name: 'Aucune' },
  { code: 'CNSS', name: 'CNSS' },
  { code: 'CNOPS', name: 'CNOPS' },
  { code: 'FAR', name: 'FAR' },
  { code: 'RAMID', name: 'RAMID' },
  { code: 'MUTUELLE_PRIVEE', name: 'Mutuelle privée' },
  { code: 'AUTRE', name: 'Autre' },
  { code: 'AMO', name: 'AMO' },
  { code: 'WAFA_ASSURANCE', name: 'WAFA ASSURANCE' },
  { code: 'ATLANTA_SANAD', name: 'ATLANTA SANAD' },
  { code: 'SANLAM', name: 'SANLAM' },
  { code: 'AXA', name: 'AXA' },
];

const EMPTY_TOKENS = new Set([
  '',
  'N/A',
  'NA',
  'NM',
  'NEANT',
  'NÉANT',
  '-',
]);

const DATE_ONLY_YEAR = /^\d{4}$/;

const BUILTIN_DATE_STYLE_IDS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 30, 36, 50, 57, 58]);

const EXCEL_DATE_EPOCH = new Date(1899, 11, 30);

function xmlUnescape(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeComparisonKey(value: string): string {
  return stripDiacritics(value).trim().toUpperCase().replace(/[\s._/-]+/g, '');
}

function excelColumnToIndex(ref: string): number {
  const letters = ref.replace(/\d+/g, '');
  let index = 0;
  for (const char of letters) {
    index = index * 26 + (char.charCodeAt(0) - 64);
  }
  return index;
}

function parseSharedStrings(xml: string): string[] {
  const strings: string[] = [];
  const siRegex = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let match: RegExpExecArray | null;
  while ((match = siRegex.exec(xml))) {
    const block = match[1];
    const textParts: string[] = [];
    const textRegex = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
    let textMatch: RegExpExecArray | null;
    while ((textMatch = textRegex.exec(block))) {
      textParts.push(xmlUnescape(textMatch[1]));
    }
    strings.push(textParts.join(''));
  }
  return strings;
}

function parseDateStyleIds(stylesXml: string): Set<number> {
  const customFormats = new Map<number, string>();
  const numFmtRegex = /<numFmt\b[^>]*numFmtId="(\d+)"[^>]*formatCode="([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = numFmtRegex.exec(stylesXml))) {
    customFormats.set(Number(match[1]), xmlUnescape(match[2]));
  }

  const styleIds = new Set<number>();
  const xfRegex = /<xf\b[^>]*numFmtId="(\d+)"[^>]*\/>/g;
  let index = 0;
  const cellXfsMatch = stylesXml.match(/<cellXfs\b[^>]*count="\d+"[^>]*>([\s\S]*?)<\/cellXfs>/);
  if (!cellXfsMatch) return styleIds;

  const block = cellXfsMatch[1];
  let xfMatch: RegExpExecArray | null;
  while ((xfMatch = xfRegex.exec(block))) {
    const numFmtId = Number(xfMatch[1]);
    const customFormat = customFormats.get(numFmtId);
    const isDate =
      BUILTIN_DATE_STYLE_IDS.has(numFmtId) ||
      (customFormat ? /[dyhms]/i.test(customFormat) : false);
    if (isDate) styleIds.add(index);
    index += 1;
  }

  return styleIds;
}

function excelSerialToDate(serial: number): Date {
  const days = Math.trunc(serial);
  return new Date(EXCEL_DATE_EPOCH.getFullYear(), EXCEL_DATE_EPOCH.getMonth(), EXCEL_DATE_EPOCH.getDate() + days);
}

function readCellValue(
  cellXml: string,
  sharedStrings: string[],
  dateStyleIds: Set<number>
): unknown {
  const typeMatch = /t="([^"]+)"/.exec(cellXml);
  const styleMatch = /s="(\d+)"/.exec(cellXml);
  const cellType = typeMatch?.[1] ?? '';
  const styleId = styleMatch ? Number(styleMatch[1]) : null;

  if (cellType === 'inlineStr') {
    const inlineMatch = /<is[^>]*>([\s\S]*?)<\/is>/.exec(cellXml);
    if (!inlineMatch) return '';
    const texts = [...inlineMatch[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((m) => xmlUnescape(m[1]));
    return texts.join('');
  }

  const valueMatch = /<v>([\s\S]*?)<\/v>/.exec(cellXml);
  if (!valueMatch) return '';
  const rawValue = xmlUnescape(valueMatch[1]).trim();

  if (cellType === 's') {
    const index = Number(rawValue);
    return Number.isFinite(index) ? sharedStrings[index] ?? '' : '';
  }

  if (cellType === 'b') {
    return rawValue === '1';
  }

  if (rawValue === '') return '';

  if (styleId !== null && dateStyleIds.has(styleId) && /^-?\d+(\.\d+)?$/.test(rawValue)) {
    return excelSerialToDate(Number(rawValue));
  }

  if (/^-?\d+(\.\d+)?$/.test(rawValue)) {
    const numeric = Number(rawValue);
    return Number.isFinite(numeric) ? numeric : rawValue;
  }

  return rawValue;
}

function parseXlsxRows(buffer: ArrayBuffer): ParsedPatientRow[] {
  const zip = unzipSync(new Uint8Array(buffer));
  const sheetXml = zip['xl/worksheets/sheet1.xml'];
  const sharedStringsXml = zip['xl/sharedStrings.xml'];
  const stylesXml = zip['xl/styles.xml'];
  if (!sheetXml) {
    return [];
  }

  const sharedStrings = sharedStringsXml ? parseSharedStrings(strFromU8(sharedStringsXml)) : [];
  const dateStyleIds = stylesXml ? parseDateStyleIds(strFromU8(stylesXml)) : new Set<number>();
  const sheetText = strFromU8(sheetXml);

  const rows: ParsedPatientRow[] = [];
  const rowRegex = /<row\b[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g;
  let rowMatch: RegExpExecArray | null;
  let headers: string[] = [];

  while ((rowMatch = rowRegex.exec(sheetText))) {
    const rowNumber = Number(rowMatch[1]);
    const rowXml = rowMatch[2];
    const rowCells = [...rowXml.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)];
    const rowData: Record<number, unknown> = {};

    for (const cellMatch of rowCells) {
      const attrs = cellMatch[1];
      const cellXml = cellMatch[0];
      const refMatch = /r="([A-Z]+\d+)"/.exec(attrs);
      if (!refMatch) continue;
      const cellIndex = excelColumnToIndex(refMatch[1]);
      rowData[cellIndex] = readCellValue(cellXml, sharedStrings, dateStyleIds);
    }

    if (rowNumber === 1) {
      headers = [];
      const maxColumn = Math.max(0, ...Object.keys(rowData).map((k) => Number(k)));
      for (let col = 1; col <= maxColumn; col++) {
        const headerValue = rowData[col];
        headers[col - 1] = String(headerValue ?? '').replace(/^\uFEFF/, '').trim();
      }
      continue;
    }

    const rowObject: ParsedPatientRow = {};
    for (let col = 1; col <= headers.length; col++) {
      const key = headers[col - 1];
      if (!key) continue;
      rowObject[key] = rowData[col];
    }
    rows.push(rowObject);
  }

  return rows;
}

function parseCsvRows(buffer: ArrayBuffer): ParsedPatientRow[] {
  const text = new TextDecoder('utf-8').decode(buffer);
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
  });
  if (parsed.errors.length > 0) {
    const error = parsed.errors[0];
    throw new Error(error.message || error.code || 'CSV invalide');
  }
  return parsed.data as ParsedPatientRow[];
}

export async function parsePatientImportRows(file: File): Promise<ParsedPatientRow[]> {
  const name = file.name.trim().toLowerCase();
  const mime = (file.type ?? '').toLowerCase();
  const buffer = await file.arrayBuffer();

  if (name.endsWith('.xlsx') || mime.includes('sheet') || mime.includes('excel')) {
    return parseXlsxRows(buffer);
  }
  return parseCsvRows(buffer);
}

export function normalizeEmptyValue(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  if (raw instanceof Date) return raw.toISOString();
  const text = String(raw).trim();
  if (EMPTY_TOKENS.has(text.toUpperCase())) return null;
  return text;
}

export function normalizeNominalField(raw: unknown): string | null {
  const value = normalizeEmptyValue(raw);
  return value === null ? null : value;
}

export function normalizePhoneValue(raw: unknown): { value: string | null; warning?: string } {
  const empty = normalizeEmptyValue(raw);
  if (empty === null) return { value: null };

  const rawText = String(raw).trim();
  const parts = rawText.split(/[\\/|;,]+/).map((part) => part.trim()).filter(Boolean);
  const source = parts.length > 0 ? parts[0] : rawText;
  const warning =
    parts.length > 1
      ? 'Plusieurs numéros détectés : seul le premier a été conservé'
      : undefined;

  let digits = source.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (digits.startsWith('212')) {
    digits = `0${digits.slice(3)}`;
  } else if (digits.startsWith('6') || digits.startsWith('7')) {
    if (digits.length === 9) digits = `0${digits}`;
  } else if (/^\d{9}$/.test(digits)) {
    digits = `0${digits}`;
  }

  return {
    value: digits.length > 0 ? digits : null,
    warning,
  };
}

export function parseImportDateValue(
  raw: unknown
): { value: Date | null; error?: string } {
  if (raw === undefined || raw === null) return { value: null };
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return { value: raw };

  const text = String(raw).trim();
  if (!text) return { value: null };
  if (DATE_ONLY_YEAR.test(text)) {
    return { value: null, error: `date complète requise (« ${text} »)` };
  }

  if (/^\d+(\.\d+)?$/.test(text)) {
    const serial = Number(text);
    if (Number.isFinite(serial) && serial > 0 && serial < 60000) {
      return { value: excelSerialToDate(serial) };
    }
  }

  const fr = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(text);
  if (fr) {
    const day = Number(fr[1]);
    const month = Number(fr[2]);
    const year = Number(fr[3]);
    const candidate = new Date(year, month - 1, day);
    if (
      candidate.getFullYear() === year &&
      candidate.getMonth() === month - 1 &&
      candidate.getDate() === day
    ) {
      return { value: candidate };
    }
    return { value: null, error: `date invalide (« ${text} »)` };
  }

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    const candidate = new Date(year, month - 1, day);
    if (
      candidate.getFullYear() === year &&
      candidate.getMonth() === month - 1 &&
      candidate.getDate() === day
    ) {
      return { value: candidate };
    }
    return { value: null, error: `date invalide (« ${text} »)` };
  }

  const asDate = new Date(text);
  if (!Number.isNaN(asDate.getTime())) {
    return { value: asDate };
  }

  return { value: null, error: `date invalide (« ${text} »)` };
}

export function normalizeInsuranceInput(raw: unknown): string | null {
  const text = normalizeEmptyValue(raw);
  if (text === null) return null;
  return normalizeComparisonKey(text);
}

export function resolveInsuranceDefinition(raw: unknown): InsuranceDefinition | null {
  const key = normalizeInsuranceInput(raw);
  if (!key) return null;

  const aliases: Record<string, InsuranceDefinition> = {
    AUCUNE: { code: 'AUCUNE', name: 'Aucune' },
    CNSS: { code: 'CNSS', name: 'CNSS' },
    CNOPS: { code: 'CNOPS', name: 'CNOPS' },
    FAR: { code: 'FAR', name: 'FAR' },
    RAMID: { code: 'RAMID', name: 'RAMID' },
    MUTUELLE: { code: 'MUTUELLE_PRIVEE', name: 'Mutuelle privée' },
    PRIVEE: { code: 'MUTUELLE_PRIVEE', name: 'Mutuelle privée' },
    PRIVE: { code: 'MUTUELLE_PRIVEE', name: 'Mutuelle privée' },
    MUTUELLEPRIVEE: { code: 'MUTUELLE_PRIVEE', name: 'Mutuelle privée' },
    AMO: { code: 'AMO', name: 'AMO' },
    CNOPSPOLICE: { code: 'CNOPS', name: 'CNOPS' },
    CNOPSPLC: { code: 'CNOPS', name: 'CNOPS' },
    ATLANTASANAD: { code: 'ATLANTA_SANAD', name: 'ATLANTA SANAD' },
    WAFAASSURANCE: { code: 'WAFA_ASSURANCE', name: 'WAFA ASSURANCE' },
    SANLAM: { code: 'SANLAM', name: 'SANLAM' },
    AXA: { code: 'AXA', name: 'AXA' },
    AUTRE: { code: 'AUTRE', name: 'Autre' },
  };

  return aliases[key] ?? null;
}

export function isInsuranceMoveCandidate(raw: unknown): boolean {
  const def = resolveInsuranceDefinition(raw);
  return Boolean(def && def.code !== 'AUTRE');
}

export function normalizeFreeTextValue(raw: unknown): string | null {
  const value = normalizeEmptyValue(raw);
  return value === null ? null : value;
}

export function resolvePatientIdentityDecision(matches: PatientIdentityMatches): PatientIdentityDecision {
  const found = [
    matches.id ? { field: 'id' as const, patient: matches.id } : null,
    matches.cin ? { field: 'cin' as const, patient: matches.cin } : null,
    matches.email ? { field: 'email' as const, patient: matches.email } : null,
  ].filter((item): item is { field: 'id' | 'cin' | 'email'; patient: PatientIdentityCandidate } => item !== null);

  if (found.length === 0) {
    return { conflict: null, selected: null };
  }

  const distinctPatientIds = new Set(found.map((item) => item.patient.id));
  if (distinctPatientIds.size <= 1) {
    return { conflict: null, selected: found[0] };
  }

  const cinMatch = matches.cin;
  const emailMatch = matches.email;
  if (cinMatch && emailMatch && cinMatch.id !== emailMatch.id) {
    return {
      conflict: {
        message: 'Conflit d’identité : le CIN correspond à un patient différent de celui correspondant à l’email.',
      },
      selected: null,
    };
  }

  const idMatch = matches.id;
  if (idMatch && cinMatch && idMatch.id !== cinMatch.id) {
    return {
      conflict: {
        message: 'Conflit d’identité : le id correspond à un patient différent de celui correspondant au CIN.',
      },
      selected: null,
    };
  }

  if (idMatch && emailMatch && idMatch.id !== emailMatch.id) {
    return {
      conflict: {
        message: 'Conflit d’identité : le id correspond à un patient différent de celui correspondant à l’email.',
      },
      selected: null,
    };
  }

  return {
    conflict: {
      message: 'Conflit d’identité : plusieurs identifiants correspondent à des patients différents.',
    },
    selected: null,
  };
}

export function validatePatientImportFileSize(fileSize: number): { status: 413; message: string } | null {
  if (fileSize > PATIENT_IMPORT_MAX_FILE_BYTES) {
    return {
      status: 413,
      message: 'Fichier trop volumineux — taille maximale autorisée : 10 Mo.',
    };
  }
  return null;
}
