/**
 * EntityCrud — pre-generated CRUD + overlay plumbing for the dashboard.
 * Compose it; NEVER re-roll dialog state, submit handlers, an overlay stack
 * or a RecordOverlayHost in the page — this file owns all of it.
 *
 * API at a glance:
 *   const data = useDashboardData();
 *   const crud = useEntityCrud(data, {
 *     // optional — the ONE semantic slot on the overlay: the record's next
 *     // workflow step. Return undefined for types without one.
 *     footer: (top) => top.type === 'kunden'
 *       ? { label: …, onClick: () => … }
 *       : undefined,
 *   });
 *
 *   `top.type` is the SAME camelCase key as `crud.<entity>` — one spelling
 *   per entity, everywhere in this API.
 *   …
 *   crud.kunden.openCreate({ …defaults })   // create dialog, prefilled — defaults are
 *                                       // shape-tolerant: bare lookup keys / record ids are fine
 *   crud.kunden.openEdit(record)            // edit dialog (recordId + defaults wired)
 *   crud.kunden.openDetail(record)          // record overlay — pass the RAW record,
 *                                       // enrichment is resolved inside
 *   crud.overlay                         // RecordOverlayStack<OverlayItem> for drills:
 *                                       // push / pop / replace / close
 *   crud.enriched.kunden              // the display-ready array for EVERY entity —
 *                                       // Enriched* where relations exist, the raw array
 *                                       // otherwise. Reuse these; never call enrich*()
 *                                       // in the page, and never guess which entity has
 *                                       // one: they all do.
 *   {crud.surfaces}                      // render ONCE at the end of the page JSX:
 *                                       // all entity dialogs + the overlay host
 *
 * Built in (do NOT re-implement): optimistic update + Rückgängig counter-write
 * on edit, fetchAll-on-error, edit-from-overlay, and per-entity overlay bodies
 * (RecordHeader + <{Entity}Details> with every relation reachable and the
 * contextual "+" prefilled). Drag writes (onEventDrop/onCardMove) stay YOURS:
 * optimistic setter first, PATCH in background, undoToast with counter-write.
 *
 * Overlay content per entity (the host renders these — you never compose
 * Details blocks yourself):
 *   kunden: vorname, nachname, telefon, email  ·  ← auftraege (list + contextual +)
 *   monteure: monteur_vorname, monteur_nachname, monteur_telefon  ·  ← auftraege (list + contextual +)
 *   auftraege: auftragsnummer, kunde, monteur, strasse, hausnummer, plz, ort, baustelle_geo, …  ·  → kunden · → monteure · ← baudokumentation (list + contextual +)
 *   baudokumentation: auftrag, foto, notiz, aufnahmedatum  ·  → auftraege
 */
import { useState, useMemo, type ReactNode } from 'react';
import type { Kunden, Monteure, Auftraege, Baudokumentation } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { enrichAuftraege, enrichBaudokumentation } from '@/lib/enrich';
import type { EnrichedAuftraege, EnrichedBaudokumentation } from '@/types/enriched';
import { useDashboardData } from '@/hooks/useDashboardData';
import {
  useRecordOverlayStack, RecordOverlayHost, RecordHeader,
  type RecordOverlayStack,
} from '@/components/widgets/RecordView';
import { KundenDialog, type KundenDialogDefaults } from '@/components/dialogs/KundenDialog';
import { KundenDetails } from '@/components/details/KundenDetails';
import { MonteureDialog, type MonteureDialogDefaults } from '@/components/dialogs/MonteureDialog';
import { MonteureDetails } from '@/components/details/MonteureDetails';
import { AuftraegeDialog, type AuftraegeDialogDefaults } from '@/components/dialogs/AuftraegeDialog';
import { AuftraegeDetails } from '@/components/details/AuftraegeDetails';
import { BaudokumentationDialog, type BaudokumentationDialogDefaults } from '@/components/dialogs/BaudokumentationDialog';
import { BaudokumentationDetails } from '@/components/details/BaudokumentationDetails';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { t, appLabel } from '@/i18n';
import { undoToast } from '@/lib/polish';
import { formatDate } from '@/lib/formatters';

// The overlay union — one branch per entity, `record` typed the way the data
// flows: Enriched* where enrichment exists, the raw record type otherwise.
// The host resolves enrichment itself; pages pass raw records everywhere.
export type OverlayItem =
  | { type: 'kunden'; record: Kunden }
  | { type: 'monteure'; record: Monteure }
  | { type: 'auftraege'; record: EnrichedAuftraege }
  | { type: 'baudokumentation'; record: EnrichedBaudokumentation };

/** The useDashboardData() return — pass it in, never re-fetch inside. */
export type EntityCrudData = ReturnType<typeof useDashboardData>;

export interface EntityCrudOptions {
  /** Per-type overlay footer — the record's next workflow step. */
  footer?: (top: OverlayItem) => ReactNode | { label: ReactNode; onClick: () => void } | undefined;
  placement?: 'side' | 'center';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface EntityCrudApi<TRecord, TDefaults> {
  /** Open the create dialog, optionally prefilled (shape-tolerant defaults). */
  openCreate: (defaults?: TDefaults) => void;
  /** Open the edit dialog for a record (recordId + defaults are wired). */
  openEdit: (record: TRecord) => void;
  /** Open the record overlay (raw record is fine — enrichment resolved inside). */
  openDetail: (record: TRecord) => void;
}

export interface EntityCrud {
  /** The overlay stack for drills: push / pop / replace / close. */
  overlay: RecordOverlayStack<OverlayItem>;
  /** Render ONCE at the end of the page JSX — all dialogs + the overlay host. */
  surfaces: ReactNode;
  kunden: EntityCrudApi<Kunden, KundenDialogDefaults>;
  monteure: EntityCrudApi<Monteure, MonteureDialogDefaults>;
  auftraege: EntityCrudApi<Auftraege, AuftraegeDialogDefaults>;
  baudokumentation: EntityCrudApi<Baudokumentation, BaudokumentationDialogDefaults>;
  /** The display-ready array per entity: Enriched* where an enrich function
   *  exists, the raw array otherwise. One key per entity so no page has to
   *  know which is which. Reuse these; never re-enrich in the page. */
  enriched: { kunden: Kunden[]; monteure: Monteure[]; auftraege: EnrichedAuftraege[]; baudokumentation: EnrichedBaudokumentation[] };
}

export function useEntityCrud(data: EntityCrudData, options?: EntityCrudOptions): EntityCrud {
  const overlay = useRecordOverlayStack<OverlayItem>();
  const [kundenDialog, setKundenDialog] = useState<{ defaults?: KundenDialogDefaults; editing?: Kunden } | null>(null);
  const [monteureDialog, setMonteureDialog] = useState<{ defaults?: MonteureDialogDefaults; editing?: Monteure } | null>(null);
  const [auftraegeDialog, setAuftraegeDialog] = useState<{ defaults?: AuftraegeDialogDefaults; editing?: Auftraege } | null>(null);
  const [baudokumentationDialog, setBaudokumentationDialog] = useState<{ defaults?: BaudokumentationDialogDefaults; editing?: Baudokumentation } | null>(null);
  const enrichedAuftraege = useMemo(() => enrichAuftraege(data.auftraege, { kundenMap: data.kundenMap, monteureMap: data.monteureMap }), [data.auftraege, data.kundenMap, data.monteureMap]);
  const enrichedBaudokumentation = useMemo(() => enrichBaudokumentation(data.baudokumentation, { auftraegeMap: data.auftraegeMap }), [data.baudokumentation, data.auftraegeMap]);

  function detailKunden(record: Kunden, push = false) {
    const item: OverlayItem = { type: 'kunden', record };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitKunden(fields: Kunden['fields']) {
    const editing = kundenDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setKunden(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateKundenEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('kunden')} — ${t('crud_updated')}`, async () => {
        data.setKunden(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateKundenEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createKundenEntry(fields);
      undoToast(`${appLabel('kunden')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailMonteure(record: Monteure, push = false) {
    const item: OverlayItem = { type: 'monteure', record };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitMonteure(fields: Monteure['fields']) {
    const editing = monteureDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setMonteure(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateMonteureEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('monteure')} — ${t('crud_updated')}`, async () => {
        data.setMonteure(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateMonteureEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createMonteureEntry(fields);
      undoToast(`${appLabel('monteure')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailAuftraege(record: Auftraege, push = false) {
    const rec = enrichedAuftraege.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'auftraege', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitAuftraege(fields: Auftraege['fields']) {
    const editing = auftraegeDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setAuftraege(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateAuftraegeEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('auftraege')} — ${t('crud_updated')}`, async () => {
        data.setAuftraege(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateAuftraegeEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createAuftraegeEntry(fields);
      undoToast(`${appLabel('auftraege')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailBaudokumentation(record: Baudokumentation, push = false) {
    const rec = enrichedBaudokumentation.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'baudokumentation', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitBaudokumentation(fields: Baudokumentation['fields']) {
    const editing = baudokumentationDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setBaudokumentation(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateBaudokumentationEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('baudokumentation')} — ${t('crud_updated')}`, async () => {
        data.setBaudokumentation(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateBaudokumentationEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createBaudokumentationEntry(fields);
      undoToast(`${appLabel('baudokumentation')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  const surfaces = (
    <>
      <KundenDialog
        open={kundenDialog !== null}
        onClose={() => setKundenDialog(null)}
        onSubmit={submitKunden}
        defaultValues={kundenDialog?.defaults}
        recordId={kundenDialog?.editing?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Kunden']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Kunden']}
      />
      <MonteureDialog
        open={monteureDialog !== null}
        onClose={() => setMonteureDialog(null)}
        onSubmit={submitMonteure}
        defaultValues={monteureDialog?.defaults}
        recordId={monteureDialog?.editing?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Monteure']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Monteure']}
      />
      <AuftraegeDialog
        open={auftraegeDialog !== null}
        onClose={() => setAuftraegeDialog(null)}
        onSubmit={submitAuftraege}
        defaultValues={auftraegeDialog?.defaults}
        recordId={auftraegeDialog?.editing?.record_id}
        kundenList={data.kunden}
        monteureList={data.monteure}
        enablePhotoScan={AI_PHOTO_SCAN['Auftraege']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Auftraege']}
      />
      <BaudokumentationDialog
        open={baudokumentationDialog !== null}
        onClose={() => setBaudokumentationDialog(null)}
        onSubmit={submitBaudokumentation}
        defaultValues={baudokumentationDialog?.defaults}
        recordId={baudokumentationDialog?.editing?.record_id}
        auftraegeList={data.auftraege}
        enablePhotoScan={AI_PHOTO_SCAN['Baudokumentation']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Baudokumentation']}
      />
      <RecordOverlayHost
        overlay={overlay}
        placement={options?.placement}
        size={options?.size}
        footer={options?.footer}
        render={(top) => {
          if (top.type === 'kunden') {
            return (
              <>
                <RecordHeader title={top.record.fields.vorname ?? appLabel('kunden')} subtitle={undefined} />
                <KundenDetails
                  record={top.record}
                  auftraegeList={data.auftraege}
                  onOpenAuftraege={(r) => detailAuftraege(r, true)}
                  onAddAuftraege={() => setAuftraegeDialog({ defaults: { kunde: createRecordUrl(APP_IDS.KUNDEN, top.record.record_id) } })}
                />
              </>
            );
          }
          if (top.type === 'monteure') {
            return (
              <>
                <RecordHeader title={top.record.fields.monteur_vorname ?? appLabel('monteure')} subtitle={undefined} />
                <MonteureDetails
                  record={top.record}
                  auftraegeList={data.auftraege}
                  onOpenAuftraege={(r) => detailAuftraege(r, true)}
                  onAddAuftraege={() => setAuftraegeDialog({ defaults: { monteur: createRecordUrl(APP_IDS.MONTEURE, top.record.record_id) } })}
                />
              </>
            );
          }
          if (top.type === 'auftraege') {
            return (
              <>
                <RecordHeader title={top.record.fields.auftragsnummer ?? appLabel('auftraege')} subtitle={top.record.fields.termin ? formatDate(top.record.fields.termin) : undefined} />
                <AuftraegeDetails
                  record={top.record}
                  kundenList={data.kunden}
                  onOpenKunden={(r) => detailKunden(r, true)}
                  monteureList={data.monteure}
                  onOpenMonteure={(r) => detailMonteure(r, true)}
                  baudokumentationList={data.baudokumentation}
                  onOpenBaudokumentation={(r) => detailBaudokumentation(r, true)}
                  onAddBaudokumentation={() => setBaudokumentationDialog({ defaults: { auftrag: createRecordUrl(APP_IDS.AUFTRAEGE, top.record.record_id) } })}
                />
              </>
            );
          }
          if (top.type === 'baudokumentation') {
            return (
              <>
                <RecordHeader title={appLabel('baudokumentation')} subtitle={top.record.fields.aufnahmedatum ? formatDate(top.record.fields.aufnahmedatum) : undefined} />
                <BaudokumentationDetails
                  record={top.record}
                  auftraegeList={data.auftraege}
                  onOpenAuftraege={(r) => detailAuftraege(r, true)}
                />
              </>
            );
          }
          return null;
        }}
        onEdit={(top) => {
          overlay.close();
          if (top.type === 'kunden') setKundenDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'monteure') setMonteureDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'auftraege') setAuftraegeDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'baudokumentation') setBaudokumentationDialog({ editing: top.record, defaults: top.record.fields });
        }}
      />
    </>
  );

  return {
    overlay,
    surfaces,
    kunden: {
      openCreate: (defaults?: KundenDialogDefaults) => setKundenDialog({ defaults }),
      openEdit: (record: Kunden) => setKundenDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: Kunden) => detailKunden(record, false),
    },
    monteure: {
      openCreate: (defaults?: MonteureDialogDefaults) => setMonteureDialog({ defaults }),
      openEdit: (record: Monteure) => setMonteureDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: Monteure) => detailMonteure(record, false),
    },
    auftraege: {
      openCreate: (defaults?: AuftraegeDialogDefaults) => setAuftraegeDialog({ defaults }),
      openEdit: (record: Auftraege) => setAuftraegeDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: Auftraege) => detailAuftraege(record, false),
    },
    baudokumentation: {
      openCreate: (defaults?: BaudokumentationDialogDefaults) => setBaudokumentationDialog({ defaults }),
      openEdit: (record: Baudokumentation) => setBaudokumentationDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: Baudokumentation) => detailBaudokumentation(record, false),
    },
    enriched: { kunden: data.kunden, monteure: data.monteure, auftraege: enrichedAuftraege, baudokumentation: enrichedBaudokumentation },
  };
}
