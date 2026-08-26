import type { Baudokumentation, Auftraege } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { MediaThumbnail } from '@/components/widgets/MediaViewer';

export interface BaudokumentationDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Baudokumentation;
  /** N:1-Ziel „Auftraege": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  auftraegeList: Auftraege[];
  /** Klick auf die Auftraege-Relation → overlay.push auf dessen Detail. */
  onOpenAuftraege?: (record: Auftraege) => void;
}

export function BaudokumentationDetails({
  record,
  auftraegeList,
  onOpenAuftraege,
}: BaudokumentationDetailsProps) {
  const auftragTarget = auftraegeList.find(r => r.record_id === extractRecordId(record.fields.auftrag));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('baudokumentation', 'foto')} className="md:col-span-2">
          {record.fields.foto ? (
            <MediaThumbnail src={record.fields.foto as string} fit="contain" className="max-h-64 w-full rounded-lg" />
          ) : '—'}
        </RecordField>
        <RecordField label={fieldLabel('baudokumentation', 'notiz')} value={record.fields.notiz} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('baudokumentation', 'aufnahmedatum')} value={record.fields.aufnahmedatum} format="date" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={1}>
        <RecordRelation
          label={fieldLabel('baudokumentation', 'auftrag')}
          name={auftragTarget?.fields.auftragsnummer ?? '—'}
          meta={[auftragTarget?.fields.strasse, auftragTarget?.fields.hausnummer].filter(Boolean).join(' · ') || undefined}
          onClick={auftragTarget && onOpenAuftraege ? () => onOpenAuftraege!(auftragTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.BAUDOKUMENTATION} recordId={record.record_id} />
    </>
  );
}
