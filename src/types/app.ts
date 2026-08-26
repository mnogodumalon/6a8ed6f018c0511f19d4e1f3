import { lookupLabel } from '@/i18n';

// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
/** A raw record URL (applookup reference). NEVER render this directly
 *  in JSX — it is a URL, not a display value. Show the enriched `*Name`
 *  field or resolve it via the entity map instead. Assignable to/from
 *  string everywhere; the `& {}` keeps the alias NAME visible in tsc
 *  error messages (a plain primitive alias gets normalized away). */
export type RecordUrl = string & {};
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Kunden {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    vorname?: string;
    nachname?: string;
    telefon?: string;
    email?: string;
  };
}

export interface Monteure {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    monteur_vorname?: string;
    monteur_nachname?: string;
    monteur_telefon?: string;
  };
}

export interface Auftraege {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    auftragsnummer?: string;
    kunde?: RecordUrl; // applookup -> URL zu 'Kunden' Record
    monteur?: RecordUrl; // applookup -> URL zu 'Monteure' Record
    strasse?: string;
    hausnummer?: string;
    plz?: string;
    ort?: string;
    baustelle_geo?: GeoLocation; // { lat, long, info }
    beschreibung?: string;
    termin?: string; // Format: YYYY-MM-DD oder ISO String
    status?: LookupValue;
  };
}

export interface Baudokumentation {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    auftrag?: RecordUrl; // applookup -> URL zu 'Auftraege' Record
    foto?: string;
    notiz?: string;
    aufnahmedatum?: string; // Format: YYYY-MM-DD oder ISO String
  };
}

export const APP_IDS = {
  KUNDEN: '6a8ed6cbb1d157f8e9997679',
  MONTEURE: '6a8ed6d075d20d67cc53236c',
  AUFTRAEGE: '6a8ed6d0468c15ce34c9ce3f',
  BAUDOKUMENTATION: '6a8ed6d193452acde96bd5a4',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'auftraege': {
    status: [{ key: "offen", get label() { return lookupLabel('auftraege', 'status', "offen") ?? "Offen"; } }, { key: "in_arbeit", get label() { return lookupLabel('auftraege', 'status', "in_arbeit") ?? "In Arbeit"; } }, { key: "fertig", get label() { return lookupLabel('auftraege', 'status', "fertig") ?? "Fertig"; } }],
  },
};

// Optimistic LookupValue writes: never re-type a label — resolve the schema
// option instead (its label is a locale-aware getter; falls back to the key).
// WRONG: status: { key: 'offen', label: 'Offen' }   (frozen in one language)
// RIGHT: status: lookupOption('<appKey>', 'status', 'offen')
export function lookupOption(app: string, field: string, key: string): LookupValue {
  return LOOKUP_OPTIONS[app]?.[field]?.find(o => o.key === key) ?? { key, label: key };
}

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'kunden': {
    'vorname': 'string/text',
    'nachname': 'string/text',
    'telefon': 'string/tel',
    'email': 'string/email',
  },
  'monteure': {
    'monteur_vorname': 'string/text',
    'monteur_nachname': 'string/text',
    'monteur_telefon': 'string/tel',
  },
  'auftraege': {
    'auftragsnummer': 'string/text',
    'kunde': 'applookup/select',
    'monteur': 'applookup/select',
    'strasse': 'string/text',
    'hausnummer': 'string/text',
    'plz': 'string/text',
    'ort': 'string/text',
    'baustelle_geo': 'geo',
    'beschreibung': 'string/textarea',
    'termin': 'date/datetimeminute',
    'status': 'lookup/radio',
  },
  'baudokumentation': {
    'auftrag': 'applookup/select',
    'foto': 'file',
    'notiz': 'string/textarea',
    'aufnahmedatum': 'date/date',
  },
};

export const HUB_TOPOLOGY: Record<string, { field: string; entity: string }[]> = {
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateKunden = StripLookup<Kunden['fields']>;
export type CreateMonteure = StripLookup<Monteure['fields']>;
export type CreateAuftraege = StripLookup<Auftraege['fields']>;
export type CreateBaudokumentation = StripLookup<Baudokumentation['fields']>;