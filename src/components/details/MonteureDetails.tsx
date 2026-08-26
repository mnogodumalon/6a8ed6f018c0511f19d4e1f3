import type { Monteure, Auftraege } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';

export interface MonteureDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Monteure;
  /** 1:N „Aufträge" (monteur): VOLLE Liste — der Block filtert auf diesen Record. */
  auftraegeList: Auftraege[];
  /** Zeilen-Klick → overlay.push auf das Auftraege-Detail (nie der Edit-Dialog). */
  onOpenAuftraege: (record: Auftraege) => void;
  /** Kontextuelles „+": öffnet den Auftraege-Dialog mit diesem Record vorgesetzt. */
  onAddAuftraege: () => void;
}

export function MonteureDetails({
  record,
  auftraegeList,
  onOpenAuftraege,
  onAddAuftraege,
}: MonteureDetailsProps) {
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('monteure', 'monteur_vorname')} value={record.fields.monteur_vorname} format="text" />
        <RecordField label={fieldLabel('monteure', 'monteur_nachname')} value={record.fields.monteur_nachname} format="text" />
        <RecordField label={fieldLabel('monteure', 'monteur_telefon')} value={record.fields.monteur_telefon} format="text" />
      </RecordSection>

      <SatelliteSection
        title={appLabel('auftraege')}
        items={auftraegeList.filter(r => extractRecordId(r.fields.monteur) === record.record_id)}
        map={r => ({ name: r.fields.auftragsnummer ?? appLabel('auftraege'), meta: r.fields.termin })}
        onOpen={onOpenAuftraege}
        onAdd={onAddAuftraege}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.MONTEURE} recordId={record.record_id} />
    </>
  );
}
