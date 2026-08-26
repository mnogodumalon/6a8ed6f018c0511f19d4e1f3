import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: ['auftrag', 'aufnahmedatum', 'notiz'],
  defaults: {
    'aufnahmedatum': {'kind': 'today'},
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};

export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
