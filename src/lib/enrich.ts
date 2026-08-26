import type { EnrichedAuftraege, EnrichedBaudokumentation } from '@/types/enriched';
import type { Auftraege, Baudokumentation, Kunden, Monteure } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface AuftraegeMaps {
  kundenMap: Map<string, Kunden>;
  monteureMap: Map<string, Monteure>;
}

export function enrichAuftraege(
  auftraege: Auftraege[],
  maps: AuftraegeMaps
): EnrichedAuftraege[] {
  return auftraege.map(r => ({
    ...r,
    kundeName: resolveDisplay(r.fields.kunde, maps.kundenMap, 'vorname', 'nachname'),
    monteurName: resolveDisplay(r.fields.monteur, maps.monteureMap, 'monteur_vorname'),
  }));
}

interface BaudokumentationMaps {
  auftraegeMap: Map<string, Auftraege>;
}

export function enrichBaudokumentation(
  baudokumentation: Baudokumentation[],
  maps: BaudokumentationMaps
): EnrichedBaudokumentation[] {
  return baudokumentation.map(r => ({
    ...r,
    auftragName: resolveDisplay(r.fields.auftrag, maps.auftraegeMap, 'auftragsnummer'),
  }));
}
