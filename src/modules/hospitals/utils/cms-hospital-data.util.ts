import * as fs from 'fs';
import * as path from 'path';

export interface CmsHospitalRecord {
  cmsId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  county: string;
  phone: string;
  facilityType: string;
  ownership: string;
  emergencyServices: string;
  birthingFriendly: string;
  cmsRating: string;
  slug: string;
}

const COMMON_ALIASES: Record<string, string> = {
  'jackson-memorial-hospital': '100022',
  'jackson-memorial': '100022',
  'jackson-health-system': '100022',
  'baptist-health-south-florida': '100008',
  'baptist-hospital-of-miami': '100008',
  'baptist-health': '100008',
  'tampa-general-hospital': '100128',
  'tampa-general': '100128',
  'nicklaus-childrens-hospital': '103301',
  'nicklaus-childrens': '103301',
  'adventhealth-orlando': '100007',
  'mount-sinai-medical-center': '100034',
  'mount-sinai': '100034',
  'aventura-hospital-and-medical-center': '100131',
  'hca-florida-aventura-hospital': '100131',
};

let cachedRecords: CmsHospitalRecord[] | null = null;
let recordsByCmsId: Map<string, CmsHospitalRecord> | null = null;
let recordsBySlug: Map<string, CmsHospitalRecord> | null = null;

export function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function resolveCsvPath(): string | null {
  const candidates = [
    process.env.CMS_CSV_PATH,
    path.resolve(__dirname, '../../../../Hospital_General_Information.csv'),
    path.resolve(process.cwd(), '../Hospital_General_Information.csv'),
    path.resolve(process.cwd(), 'Hospital_General_Information.csv'),
    '/home/cx-rounak/Projects/opencurtain/Hospital_General_Information.csv',
  ];

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function loadCmsRecords(): CmsHospitalRecord[] {
  if (cachedRecords) {
    return cachedRecords;
  }

  const csvPath = resolveCsvPath();
  if (!csvPath) {
    cachedRecords = [];
    recordsByCmsId = new Map();
    recordsBySlug = new Map();
    return cachedRecords;
  }

  try {
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);

    if (lines.length < 2) {
      cachedRecords = [];
      recordsByCmsId = new Map();
      recordsBySlug = new Map();
      return cachedRecords;
    }

    const headers = parseCsvLine(lines[0]).map((h) =>
      h.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_'),
    );

    const facilityIdIndex = headers.findIndex((h) => h.includes('facility_id') || h === 'cms_id');
    const nameIndex = headers.findIndex((h) => h.includes('facility_name') || h.includes('hospital_name'));
    const addressIndex = headers.findIndex((h) => h === 'address');
    const cityIndex = headers.findIndex((h) => h.includes('city'));
    const stateIndex = headers.findIndex((h) => h === 'state');
    const zipIndex = headers.findIndex((h) => h.includes('zip'));
    const countyIndex = headers.findIndex((h) => h.includes('county'));
    const phoneIndex = headers.findIndex((h) => h.includes('telephone') || h.includes('phone'));
    const typeIndex = headers.findIndex((h) => h.includes('hospital_type') || h.includes('facility_type'));
    const ownershipIndex = headers.findIndex((h) => h.includes('ownership'));
    const emergencyIndex = headers.findIndex((h) => h.includes('emergency'));
    const birthingIndex = headers.findIndex((h) => h.includes('birthing'));
    const ratingIndex = headers.findIndex((h) => h.includes('overall_rating'));

    const records: CmsHospitalRecord[] = [];
    const byId = new Map<string, CmsHospitalRecord>();
    const bySlug = new Map<string, CmsHospitalRecord>();

    for (let i = 1; i < lines.length; i += 1) {
      const row = parseCsvLine(lines[i]);
      const cmsId = row[facilityIdIndex]?.trim();
      const name = row[nameIndex]?.trim();
      const city = row[cityIndex]?.trim();
      const state = row[stateIndex]?.trim();

      if (!cmsId || !name || !city || !state) {
        continue;
      }

      const slug = toSlug(name);
      const record: CmsHospitalRecord = {
        cmsId,
        name,
        address: row[addressIndex]?.trim() || '',
        city,
        state,
        zipCode: row[zipIndex]?.trim() || '',
        county: row[countyIndex]?.trim() || '',
        phone: row[phoneIndex]?.trim() || '',
        facilityType: row[typeIndex]?.trim() || 'Acute Care Hospitals',
        ownership: row[ownershipIndex]?.trim() || '',
        emergencyServices: row[emergencyIndex]?.trim() || '',
        birthingFriendly: row[birthingIndex]?.trim() || '',
        cmsRating: row[ratingIndex]?.trim() || '',
        slug,
      };

      records.push(record);
      byId.set(cmsId, record);
      byId.set(`CMS-${cmsId}`, record);
      bySlug.set(slug, record);
    }

    cachedRecords = records;
    recordsByCmsId = byId;
    recordsBySlug = bySlug;

    return cachedRecords;
  } catch (error) {
    console.error('Failed to load CMS hospital records from CSV:', error);
    cachedRecords = [];
    recordsByCmsId = new Map();
    recordsBySlug = new Map();
    return cachedRecords;
  }
}

export function findCmsHospitalById(cmsId: string): CmsHospitalRecord | null {
  loadCmsRecords();
  const normalized = cmsId.trim();
  const stripped = normalized.replace(/^CMS-/i, '');

  return (
    recordsByCmsId?.get(normalized) ??
    recordsByCmsId?.get(stripped) ??
    recordsByCmsId?.get(`CMS-${stripped}`) ??
    null
  );
}

export function getHospitalAliasCmsId(term: string): string | null {
  const normalized = toSlug(term);
  return COMMON_ALIASES[normalized] ?? null;
}

export function findCmsHospitalBySlugOrName(slugOrName: string): CmsHospitalRecord | null {
  loadCmsRecords();
  const trimmed = slugOrName.trim();
  const normalizedSlug = toSlug(trimmed);

  // 1. Direct slug match
  if (recordsBySlug?.has(normalizedSlug)) {
    return recordsBySlug.get(normalizedSlug)!;
  }

  // 2. Alias match
  const aliasCmsId = COMMON_ALIASES[normalizedSlug];
  if (aliasCmsId) {
    const aliasRecord = findCmsHospitalById(aliasCmsId);
    if (aliasRecord) {
      return aliasRecord;
    }
  }

  // 3. CMS ID match
  const byId = findCmsHospitalById(trimmed);
  if (byId) {
    return byId;
  }

  // 4. Fuzzy / word match in cached records
  const cleanTerm = normalizedSlug.replace(/-/g, ' ');
  const records = cachedRecords || [];
  
  for (const record of records) {
    const recNameLower = record.name.toLowerCase();
    if (recNameLower === cleanTerm || recNameLower.includes(cleanTerm)) {
      return record;
    }
  }

  return null;
}

export function searchCmsHospitals(query: string, limit = 10): CmsHospitalRecord[] {
  const records = loadCmsRecords();
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return records.slice(0, limit);
  }

  const aliasCmsId = getHospitalAliasCmsId(trimmed);
  const results: CmsHospitalRecord[] = [];
  const seen = new Set<string>();

  if (aliasCmsId) {
    const aliasRec = findCmsHospitalById(aliasCmsId);
    if (aliasRec) {
      results.push(aliasRec);
      seen.add(aliasRec.cmsId);
    }
  }

  for (const record of records) {
    if (seen.has(record.cmsId)) {
      continue;
    }

    if (
      record.cmsId.toLowerCase().includes(trimmed) ||
      record.name.toLowerCase().includes(trimmed) ||
      record.city.toLowerCase().includes(trimmed) ||
      record.state.toLowerCase().includes(trimmed) ||
      record.facilityType.toLowerCase().includes(trimmed)
    ) {
      results.push(record);
      seen.add(record.cmsId);
      if (results.length >= limit) {
        break;
      }
    }
  }

  return results;
}
