import { useMemo, useState, useCallback } from 'react';
import { format, parseISO, isToday, isBefore, isAfter, addDays } from 'date-fns';
import {
  IconPlus, IconCamera, IconAlertTriangle, IconCheck,
  IconClock, IconMapPin, IconUser,
} from '@tabler/icons-react';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { APP_IDS, LOOKUP_OPTIONS, lookupOption } from '@/types/app';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import { lookupKey, formatDate } from '@/lib/formatters';
import { tx, appLabel } from '@/i18n';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { KanbanWidget, type KanbanCard, type KanbanColumn, type KanbanTone } from '@/components/widgets/KanbanWidget';
import { Button } from '@/components/ui/button';

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const {
    auftraege, baudokumentation,
    auftraegeMap,
    setAuftraege,
    fetchAll,
  } = data;

  const clock = useClock();
  const crud = useEntityCrud(data, {
    footer: (top) => {
      if (top.type === 'auftraege') {
        const rec = top.record;
        const status = lookupKey(rec.fields.status);
        if (status === 'offen') {
          return {
            label: tx('In Arbeit setzen'),
            onClick: () => advanceStatus(rec.record_id, 'offen', 'in_arbeit'),
          };
        }
        if (status === 'in_arbeit') {
          return {
            label: tx('Als Fertig markieren'),
            onClick: () => advanceStatus(rec.record_id, 'in_arbeit', 'fertig'),
          };
        }
      }
      return undefined;
    },
  });

  const enrichedAuftraege = crud.enriched.auftraege;
  const enrichedBaudokumentation = crud.enriched.baudokumentation;

  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Advance status helper — optimistic, shared by board + overlay footer + banner
  const advanceStatus = useCallback(async (
    recordId: string,
    fromStatus: string,
    toStatus: string,
  ) => {
    const prev = auftraege.find(a => a.record_id === recordId);
    if (!prev) return;
    const nextLv = lookupOption('auftraege', 'status', toStatus);
    const prevLv = lookupOption('auftraege', 'status', fromStatus);
    setAuftraege(list =>
      list.map(a =>
        a.record_id === recordId
          ? { ...a, fields: { ...a.fields, status: nextLv } }
          : a,
      ),
    );
    undoToast(
      tx`Auftrag ${prev.fields.auftragsnummer ?? recordId} — Status geändert`,
      async () => {
        setAuftraege(list =>
          list.map(a =>
            a.record_id === recordId
              ? { ...a, fields: { ...a.fields, status: prevLv } }
              : a,
          ),
        );
        try {
          await LivingAppsService.updateAuftraegeEntry(recordId, { status: fromStatus });
        } catch {
          await fetchAll();
        }
      },
    );
    try {
      await LivingAppsService.updateAuftraegeEntry(recordId, { status: toStatus });
    } catch {
      await fetchAll();
    }
  }, [auftraege, setAuftraege, fetchAll]);

  // Columns from schema (inside component body — locale-aware getter)
  const COLUMNS = useMemo<KanbanColumn[]>(
    () => (LOOKUP_OPTIONS['auftraege']?.['status'] ?? []).map(o => ({ key: o.key, label: o.label })),
    [],
  );

  // Tone per status
  const toneForStatus = (status: string | undefined): KanbanTone => {
    if (status === 'fertig') return 'default';
    if (status === 'in_arbeit') return 'success';
    return 'warning';
  };

  // Today's date key
  const todayKey = format(clock, 'yyyy-MM-dd');

  // Kanban cards
  const cards = useMemo<KanbanCard[]>(
    () =>
      enrichedAuftraege
        .filter(a => statusFilter === null || lookupKey(a.fields.status) === statusFilter)
        .map(a => {
          const status = lookupKey(a.fields.status) ?? 'offen';
          const termin = a.fields.termin;
          const terminDay = termin ? termin.slice(0, 10) : null;
          const isOverdue = terminDay && terminDay < todayKey && status !== 'fertig';
          const isToday_ = terminDay === todayKey;
          return {
            id: `auftrag:${a.record_id}`,
            column: status,
            title: a.kundeName || (a.fields.auftragsnummer ?? tx('Unbekannt')),
            subtitle: [
              a.fields.ort ? `${a.fields.ort}` : null,
              a.monteurName || null,
              termin ? formatDate(termin) : null,
            ]
              .filter(Boolean)
              .join(' · '),
            tone: isOverdue ? 'destructive' : toneForStatus(status),
            badge: isOverdue
              ? tx('Überfällig')
              : isToday_
              ? tx('Heute')
              : undefined,
          };
        }),
    [enrichedAuftraege, statusFilter, todayKey],
  );

  // Move card — optimistic, plain key accepted by API
  const moveCard = useCallback(async (cardId: string, newColumn: string) => {
    const rid = cardId.split(':')[1];
    if (!rid) return;
    const prev = auftraege.find(a => a.record_id === rid);
    if (!prev) return;
    const fromStatus = lookupKey(prev.fields.status) ?? 'offen';
    const nextLv = lookupOption('auftraege', 'status', newColumn);
    const prevLv = lookupOption('auftraege', 'status', fromStatus);
    setAuftraege(list =>
      list.map(a =>
        a.record_id === rid
          ? { ...a, fields: { ...a.fields, status: nextLv } }
          : a,
      ),
    );
    undoToast(
      tx`Auftrag verschoben nach ${nextLv.label}`,
      async () => {
        setAuftraege(list =>
          list.map(a =>
            a.record_id === rid
              ? { ...a, fields: { ...a.fields, status: prevLv } }
              : a,
          ),
        );
        try {
          await LivingAppsService.updateAuftraegeEntry(rid, { status: fromStatus });
        } catch {
          await fetchAll();
        }
      },
    );
    try {
      await LivingAppsService.updateAuftraegeEntry(rid, { status: newColumn });
    } catch {
      await fetchAll();
    }
  }, [auftraege, setAuftraege, fetchAll]);

  // KPI counts
  const total = enrichedAuftraege.length;
  const offen = enrichedAuftraege.filter(a => lookupKey(a.fields.status) === 'offen').length;
  const inArbeit = enrichedAuftraege.filter(a => lookupKey(a.fields.status) === 'in_arbeit').length;
  const fertig = enrichedAuftraege.filter(a => lookupKey(a.fields.status) === 'fertig').length;

  // Überfällig: Termin vergangen und noch nicht fertig
  const ueberfaellig = enrichedAuftraege.filter(a => {
    const t = a.fields.termin;
    if (!t) return false;
    const day = t.slice(0, 10);
    return day < todayKey && lookupKey(a.fields.status) !== 'fertig';
  });

  // Heute fällig
  const heuteFaellig = enrichedAuftraege.filter(a => {
    const t = a.fields.termin;
    if (!t) return false;
    return t.slice(0, 10) === todayKey && lookupKey(a.fields.status) !== 'fertig';
  });

  // Letzte Fotos (Baudokumentation)
  const letzteFotos = [...enrichedBaudokumentation]
    .sort((a, b) => (b.fields.aufnahmedatum ?? b.createdat).localeCompare(a.fields.aufnahmedatum ?? a.createdat))
    .slice(0, 6);

  // Context line
  const ueberfaelligNamen = namen(ueberfaellig.map(a => a.kundeName ?? a.fields.auftragsnummer ?? ''));
  const heuteFaelligNamen = namen(heuteFaellig.map(a => a.kundeName ?? a.fields.auftragsnummer ?? ''));

  const contextLine = useMemo(() => {
    if (ueberfaellig.length > 0 && heuteFaellig.length > 0) {
      return tx`${ueberfaelligNamen} überfällig. Heute fällig: ${heuteFaelligNamen}.`;
    }
    if (ueberfaellig.length > 0) {
      return tx`${ueberfaelligNamen} — ${ueberfaellig.length} ${ueberfaellig.length === 1 ? tx('Auftrag überfällig') : tx('Aufträge überfällig')}.`;
    }
    if (heuteFaellig.length > 0) {
      return tx`Heute fällig: ${heuteFaelligNamen}.`;
    }
    if (inArbeit > 0) {
      return tx`${inArbeit} ${inArbeit === 1 ? tx('Auftrag in Arbeit') : tx('Aufträge in Arbeit')} — alles läuft.`;
    }
    return tx('Keine offenen Aufträge — alles erledigt.');
  }, [ueberfaellig.length, heuteFaellig.length, inArbeit, ueberfaelligNamen, heuteFaelligNamen]);

  // Heute & Überfällig for WorkList
  const dringlichAuftraege = [
    ...ueberfaellig,
    ...heuteFaellig.filter(a => !ueberfaellig.find(u => u.record_id === a.record_id)),
  ].slice(0, 8);

  // Empty state
  if (total === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{gruss(clock)}</h1>
          <p className="text-muted-foreground mt-1">{tx('Leg deinen ersten Auftrag an und starte die digitale Auftragsverwaltung.')}</p>
        </div>
        <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
          <IconMapPin size={48} className="text-muted-foreground" stroke={1.5} />
          <div>
            <h2 className="text-xl font-semibold mb-2">{tx('Willkommen in deiner Auftragsverwaltung')}</h2>
            <p className="text-muted-foreground max-w-sm">
              {tx('Verwalte alle Aufträge, Monteure und Baudokumentation an einem Ort — ohne Zettelwirtschaft.')}
            </p>
          </div>
          <Button onClick={() => crud.auftraege.openCreate({ status: 'offen' })}>
            <IconPlus size={16} className="shrink-0 mr-1" />
            {tx('Ersten Auftrag anlegen')}
          </Button>
        </div>
        {crud.surfaces}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground truncate">{gruss(clock)}</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">{contextLine}</p>
        </div>
        <Button onClick={() => crud.auftraege.openCreate({ status: 'offen' })} className="shrink-0">
          <IconPlus size={16} className="shrink-0 mr-1" />
          {tx('Neuer Auftrag')}
        </Button>
      </div>

      <DashboardGrid
        variant="wide"
        hero={
          ueberfaellig.length > 0 ? (
            <HeroBanner
              icon={<IconAlertTriangle size={18} />}
              action={{
                label: tx('In Arbeit setzen'),
                onClick: () => advanceStatus(ueberfaellig[0].record_id, 'offen', 'in_arbeit'),
              }}
            >
              <b>{ueberfaelligNamen}</b>{' '}
              {ueberfaellig.length === 1
                ? tx('— 1 Auftrag überfällig.')
                : tx`— ${ueberfaellig.length} Aufträge überfällig.`}
            </HeroBanner>
          ) : undefined
        }
        kpis={
          <StatStrip>
            <StatStripItem
              title={tx('Gesamt')}
              value={total}
              icon={<IconMapPin size={16} className="shrink-0" />}
            />
            <StatStripItem
              title={tx('Offen')}
              value={offen}
              icon={<IconClock size={16} className="shrink-0" />}
              tone={offen > 0 ? 'warning' : 'default'}
              onClick={() => setStatusFilter(f => f === 'offen' ? null : 'offen')}
              active={statusFilter === 'offen'}
            />
            <StatStripItem
              title={tx('In Arbeit')}
              value={inArbeit}
              icon={<IconUser size={16} className="shrink-0" />}
              tone={inArbeit > 0 ? 'primary' : 'default'}
              onClick={() => setStatusFilter(f => f === 'in_arbeit' ? null : 'in_arbeit')}
              active={statusFilter === 'in_arbeit'}
            />
            <StatStripItem
              title={tx('Fertig')}
              value={fertig}
              icon={<IconCheck size={16} className="shrink-0" />}
              tone={fertig > 0 ? 'success' : 'default'}
              onClick={() => setStatusFilter(f => f === 'fertig' ? null : 'fertig')}
              active={statusFilter === 'fertig'}
            />
            <StatStripItem
              title={tx('Überfällig')}
              value={ueberfaellig.length}
              icon={<IconAlertTriangle size={16} className="shrink-0" />}
              tone={ueberfaellig.length > 0 ? 'destructive' : 'default'}
              onClick={() => setStatusFilter(null)}
              active={false}
            />
          </StatStrip>
        }
        primary={
          <KanbanWidget
            cards={cards}
            columns={COLUMNS}
            defaultCollapsed={['fertig']}
            onCardClick={card => {
              const rid = card.id.split(':')[1];
              const rec = auftraege.find(a => a.record_id === rid);
              if (rec) crud.auftraege.openDetail(rec);
            }}
            onCardMove={moveCard}
            onAddCard={column => crud.auftraege.openCreate({ status: column })}
          />
        }
        aside={
          <>
            <WorkList
              title={tx('Heute fällig & überfällig')}
              items={dringlichAuftraege.map(a => {
                const status = lookupKey(a.fields.status) ?? 'offen';
                const termin = a.fields.termin;
                const terminDay = termin ? termin.slice(0, 10) : null;
                const isOverdue = terminDay && terminDay < todayKey;
                return {
                  id: a.record_id,
                  title: a.kundeName || a.fields.auftragsnummer || tx('Unbenannt'),
                  secondLine: (
                    <>
                      {isOverdue ? (
                        <span className="font-medium text-destructive">{tx('Überfällig')}</span>
                      ) : (
                        <span className="font-medium text-amber-600">{tx('Heute')}</span>
                      )}
                      {a.monteurName && (
                        <span className="text-muted-foreground"> · {a.monteurName}</span>
                      )}
                      {termin && (
                        <span className="text-muted-foreground"> · {formatDate(termin)}</span>
                      )}
                    </>
                  ),
                  action:
                    status === 'offen'
                      ? {
                          label: tx('Starten'),
                          onClick: () => advanceStatus(a.record_id, 'offen', 'in_arbeit'),
                        }
                      : status === 'in_arbeit'
                      ? {
                          label: tx('Fertig'),
                          onClick: () => advanceStatus(a.record_id, 'in_arbeit', 'fertig'),
                        }
                      : undefined,
                };
              })}
              onItemClick={id => {
                const rec = auftraege.find(a => a.record_id === id);
                if (rec) crud.auftraege.openDetail(rec);
              }}
              empty={{
                text:
                  heuteFaellig.length === 0 && ueberfaellig.length === 0
                    ? tx('Heute nichts fällig — gut aufgestellt!')
                    : tx('Alle dringenden Aufträge sichtbar'),
                action: { label: tx('Neuer Auftrag'), onClick: () => crud.auftraege.openCreate({ status: 'offen' }) },
              }}
            />
            <WorkList
              title={tx('Letzte Baudokumentation')}
              items={letzteFotos.map(b => ({
                id: b.record_id,
                title: b.auftragName || tx('Auftrag unbekannt'),
                secondLine: (
                  <>
                    {b.fields.notiz && (
                      <span className="text-muted-foreground truncate">{b.fields.notiz}</span>
                    )}
                    {b.fields.aufnahmedatum && (
                      <span className="text-muted-foreground"> · {formatDate(b.fields.aufnahmedatum)}</span>
                    )}
                  </>
                ),
                action: {
                  label: tx('Auftrag öffnen'),
                  onClick: () => {
                    const auftrId = extractRecordId(b.fields.auftrag);
                    const rec = auftrId ? auftraegeMap.get(auftrId) : null;
                    if (rec) crud.auftraege.openDetail(rec);
                    else crud.baudokumentation.openDetail(b);
                  },
                },
              }))}
              onItemClick={id => {
                const rec = enrichedBaudokumentation.find(b => b.record_id === id);
                if (rec) crud.baudokumentation.openDetail(rec);
              }}
              empty={{
                text: tx('Noch keine Fotos abgelegt'),
                action: {
                  label: tx('Foto hinzufügen'),
                  onClick: () => crud.baudokumentation.openCreate({}),
                },
              }}
            />
          </>
        }
      />

      {crud.surfaces}
    </div>
  );
}
