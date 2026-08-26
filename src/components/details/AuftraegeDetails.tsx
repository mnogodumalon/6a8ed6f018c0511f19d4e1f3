import type { Auftraege, Kunden, Monteure, Baudokumentation } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { MapRouteLinks } from '@/components/widgets/MapWidget';
import { SatelliteSection } from '@/components/SatelliteSection';

export interface AuftraegeDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Auftraege;
  /** N:1-Ziel „Kunden": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  kundenList: Kunden[];
  /** Klick auf die Kunden-Relation → overlay.push auf dessen Detail. */
  onOpenKunden?: (record: Kunden) => void;
  /** N:1-Ziel „Monteure": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  monteureList: Monteure[];
  /** Klick auf die Monteure-Relation → overlay.push auf dessen Detail. */
  onOpenMonteure?: (record: Monteure) => void;
  /** 1:N „Baudokumentation" (auftrag): VOLLE Liste — der Block filtert auf diesen Record. */
  baudokumentationList: Baudokumentation[];
  /** Zeilen-Klick → overlay.push auf das Baudokumentation-Detail (nie der Edit-Dialog). */
  onOpenBaudokumentation: (record: Baudokumentation) => void;
  /** Kontextuelles „+": öffnet den Baudokumentation-Dialog mit diesem Record vorgesetzt. */
  onAddBaudokumentation: () => void;
}

export function AuftraegeDetails({
  record,
  kundenList,
  onOpenKunden,
  monteureList,
  onOpenMonteure,
  baudokumentationList,
  onOpenBaudokumentation,
  onAddBaudokumentation,
}: AuftraegeDetailsProps) {
  const kundeTarget = kundenList.find(r => r.record_id === extractRecordId(record.fields.kunde));
  const monteurTarget = monteureList.find(r => r.record_id === extractRecordId(record.fields.monteur));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('auftraege', 'auftragsnummer')} value={record.fields.auftragsnummer} format="text" />
        <RecordField label={fieldLabel('auftraege', 'strasse')} value={record.fields.strasse} format="text" />
        <RecordField label={fieldLabel('auftraege', 'hausnummer')} value={record.fields.hausnummer} format="text" />
        <RecordField label={fieldLabel('auftraege', 'plz')} value={record.fields.plz} format="text" />
        <RecordField label={fieldLabel('auftraege', 'ort')} value={record.fields.ort} format="text" />
        <RecordField label={fieldLabel('auftraege', 'baustelle_geo')}>
          {record.fields.baustelle_geo ? (
            <div className="space-y-1">
              <div>{record.fields.baustelle_geo.info ?? `${record.fields.baustelle_geo.lat}, ${record.fields.baustelle_geo.long}`}</div>
              {/* Directions links — the map popup is hover-fleeting; the overlay
                  is the only mobile-reachable place for navigation. */}
              <MapRouteLinks lat={record.fields.baustelle_geo.lat} long={record.fields.baustelle_geo.long} />
            </div>
          ) : '—'}
        </RecordField>
        <RecordField label={fieldLabel('auftraege', 'beschreibung')} value={record.fields.beschreibung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('auftraege', 'termin')} value={record.fields.termin} format="datetime" />
        <RecordField label={fieldLabel('auftraege', 'status')} value={record.fields.status} format="pill" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={2}>
        <RecordRelation
          label={fieldLabel('auftraege', 'kunde')}
          name={kundeTarget?.fields.vorname ?? '—'}
          meta={[kundeTarget?.fields.telefon, kundeTarget?.fields.email].filter(Boolean).join(' · ') || undefined}
          onClick={kundeTarget && onOpenKunden ? () => onOpenKunden!(kundeTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('auftraege', 'monteur')}
          name={monteurTarget?.fields.monteur_vorname ?? '—'}
          meta={[monteurTarget?.fields.monteur_telefon].filter(Boolean).join(' · ') || undefined}
          onClick={monteurTarget && onOpenMonteure ? () => onOpenMonteure!(monteurTarget!) : undefined}
        />
      </RecordSection>

      <SatelliteSection
        title={appLabel('baudokumentation')}
        items={baudokumentationList.filter(r => extractRecordId(r.fields.auftrag) === record.record_id)}
        map={r => ({ name: appLabel('baudokumentation'), meta: r.fields.aufnahmedatum })}
        onOpen={onOpenBaudokumentation}
        onAdd={onAddBaudokumentation}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.AUFTRAEGE} recordId={record.record_id} />
    </>
  );
}
