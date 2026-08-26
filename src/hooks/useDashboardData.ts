import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Kunden, Monteure, Auftraege, Baudokumentation } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { t } from '@/i18n';

/** Dashboard data + the OPTIMISTIC-WRITE API.
 *
 *  The per-entity setters (`set<Entity>`) are exported for exactly one job:
 *  optimistic updates on drag writes (onEventDrop / onEventResize /
 *  onCardMove). Call the setter FIRST — the bar/card lands instantly — then
 *  fire the PATCH in the background and call `fetchAll()` ONLY in the catch.
 *  Never await the PATCH before updating state (the UI freezes for the full
 *  round-trip on every drag) and never refetch after a successful write.
 *  There is no other mechanism (no `__optimistic`, no `mutate`).
 */
export function useDashboardData() {
  const [kunden, setKunden] = useState<Kunden[]>([]);
  const [monteure, setMonteure] = useState<Monteure[]>([]);
  const [auftraege, setAuftraege] = useState<Auftraege[]>([]);
  const [baudokumentation, setBaudokumentation] = useState<Baudokumentation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [kundenData, monteureData, auftraegeData, baudokumentationData] = await Promise.all([
        LivingAppsService.getKunden(),
        LivingAppsService.getMonteure(),
        LivingAppsService.getAuftraege(),
        LivingAppsService.getBaudokumentation(),
      ]);
      setKunden(kundenData);
      setMonteure(monteureData);
      setAuftraege(auftraegeData);
      setBaudokumentation(baudokumentationData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(t('data_load_failed')));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [kundenData, monteureData, auftraegeData, baudokumentationData] = await Promise.all([
          LivingAppsService.getKunden(),
          LivingAppsService.getMonteure(),
          LivingAppsService.getAuftraege(),
          LivingAppsService.getBaudokumentation(),
        ]);
        setKunden(kundenData);
        setMonteure(monteureData);
        setAuftraege(auftraegeData);
        setBaudokumentation(baudokumentationData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    // assistant:data-changed comes from the assistant (<la-klar-assistant>)
    // after every mutation. The element additionally fires the legacy
    // dashboard-refresh event for OLD deployed bundles — do NOT subscribe to
    // both here, or every mutation fetches twice.
    window.addEventListener('assistant:data-changed', handleRefresh);
    return () => window.removeEventListener('assistant:data-changed', handleRefresh);
  }, []);

  const kundenMap = useMemo(() => {
    const m = new Map<string, Kunden>();
    kunden.forEach(r => m.set(r.record_id, r));
    return m;
  }, [kunden]);

  const monteureMap = useMemo(() => {
    const m = new Map<string, Monteure>();
    monteure.forEach(r => m.set(r.record_id, r));
    return m;
  }, [monteure]);

  const auftraegeMap = useMemo(() => {
    const m = new Map<string, Auftraege>();
    auftraege.forEach(r => m.set(r.record_id, r));
    return m;
  }, [auftraege]);

  return { kunden, setKunden, monteure, setMonteure, auftraege, setAuftraege, baudokumentation, setBaudokumentation, loading, error, fetchAll, kundenMap, monteureMap, auftraegeMap };
}

/** The hook's return — the `data` prop of DashboardOverview in the Ready-Wrapper form. */
export type DashboardData = ReturnType<typeof useDashboardData>;