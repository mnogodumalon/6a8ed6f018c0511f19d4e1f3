import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: ['auftragsnummer', 'kunde', 'monteur', {'row': ['strasse', 'hausnummer'], 'cols': '2fr 1fr'}, {'row': ['plz', 'ort'], 'cols': '1fr 2fr'}, 'beschreibung', 'termin', 'status'],
  defaults: {
    'termin': {'kind': 'today', 'withTime': true},
    'status': {'kind': 'lookup', 'key': 'offen', 'label': 'Offen'},
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};

export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
