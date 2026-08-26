import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import type { Auftraege, Kunden, Monteure } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { IconArrowLeft, IconTrash } from '@tabler/icons-react';
import {
  RecordView, RecordHeader, RecordKeyFacts, RecordSection, RecordField,
  RecordAttachments, RecordViewSkeleton, RecordViewEmpty,
} from '@/components/widgets/RecordView';
import { AuftraegeDialog } from '@/components/dialogs/AuftraegeDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { formEnhancements } from '@/config/form-enhancements/Auftraege';
import { evalComputed } from '@/config/form-enhancements/types';
import { t, appLabel, fieldLabel, localeTag, CURRENCY } from '@/i18n';

export default function AuftraegeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<Auftraege | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [kundenList, setKundenList] = useState<Kunden[]>([]);
  const [monteureList, setMonteureList] = useState<Monteure[]>([]);

  useEffect(() => { loadData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, kundenData, monteureData] = await Promise.all([
        LivingAppsService.getAuftraege(),
        LivingAppsService.getKunden(),
        LivingAppsService.getMonteure(),
      ]);
      setKundenList(kundenData);
      setMonteureList(monteureData);
      setRecord(mainData.find(r => r.record_id === id) ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(fields: Auftraege['fields']) {
    if (!record) return;
    await LivingAppsService.updateAuftraegeEntry(record.record_id, fields);
    await loadData();
    setEditing(false);
  }

  async function handleDelete() {
    if (!record) return;
    await LivingAppsService.deleteAuftraegeEntry(record.record_id);
    setDeleteOpen(false);
    navigate('/auftraege');
  }

  function getKundenDisplayName(url?: unknown) {
    if (!url) return '—';
    const refId = extractRecordId(url);
    return kundenList.find(r => r.record_id === refId)?.fields.vorname ?? '—';
  }

  function getMonteureDisplayName(url?: unknown) {
    if (!url) return '—';
    const refId = extractRecordId(url);
    return monteureList.find(r => r.record_id === refId)?.fields.monteur_vorname ?? '—';
  }

  if (loading) {
    return <RecordViewSkeleton />;
  }

  if (!record) {
    return (
      <RecordViewEmpty
        title={t('not_found')}
        action={
          <Button variant="ghost" onClick={() => navigate('/auftraege')}>
            <IconArrowLeft className="h-4 w-4 mr-1.5" />
            {t('back')}
          </Button>
        }
      />
    );
  }

  return (
    <RecordView
      onBack={() => navigate('/auftraege')}
      onEdit={() => setEditing(true)}
      backLabel={t('back')}
      editLabel={t('edit_button')}
    >
      <RecordHeader title={record.fields.auftragsnummer ?? appLabel('auftraege')} />

      {(() => {
        const lookupLists: Record<string, unknown> = {
          kunde: kundenList,
          monteur: monteureList,
        };
        const fmtComputed = (k: string, n: number) =>
          /(?:kosten|preis|betrag|gesamt|netto|brutto|summe|mwst|rabatt|anzahlung|umsatz|saldo)/i.test(k)
            ? n.toLocaleString(localeTag(), { style: 'currency', currency: CURRENCY, minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : n.toLocaleString(localeTag(), { maximumFractionDigits: 2 });
        const computedFacts = Object.entries(formEnhancements.computed)
          .map(([key, formula]) => {
            const v = evalComputed(formula, record!.fields as Record<string, unknown>, { lookupLists });
            return v != null
              ? { label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '), value: fmtComputed(key, v) }
              : null;
          })
          .filter((f): f is { label: string; value: string } => f !== null);
        return computedFacts.length > 0 ? <RecordKeyFacts items={computedFacts} /> : null;
      })()}

      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('auftraege', 'auftragsnummer')} value={record.fields.auftragsnummer} format="text" />
        <RecordField label={fieldLabel('auftraege', 'kunde')} value={getKundenDisplayName(record.fields.kunde)} format="text" />
        <RecordField label={fieldLabel('auftraege', 'monteur')} value={getMonteureDisplayName(record.fields.monteur)} format="text" />
        <RecordField label={fieldLabel('auftraege', 'strasse')} value={record.fields.strasse} format="text" />
        <RecordField label={fieldLabel('auftraege', 'hausnummer')} value={record.fields.hausnummer} format="text" />
        <RecordField label={fieldLabel('auftraege', 'plz')} value={record.fields.plz} format="text" />
        <RecordField label={fieldLabel('auftraege', 'ort')} value={record.fields.ort} format="text" />
        <RecordField label={fieldLabel('auftraege', 'beschreibung')} value={record.fields.beschreibung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('auftraege', 'termin')} value={record.fields.termin} format="datetime" />
        <RecordField label={fieldLabel('auftraege', 'status')} value={record.fields.status} format="pill" />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.AUFTRAEGE} recordId={record.record_id} />

      <div className="flex justify-end pt-2">
        <Button variant="ghost" onClick={() => setDeleteOpen(true)} className="text-destructive hover:text-destructive">
          <IconTrash className="h-4 w-4 mr-1.5" />
          {t('delete')}
        </Button>
      </div>

      <AuftraegeDialog
        open={editing}
        onClose={() => setEditing(false)}
        onSubmit={handleUpdate}
        defaultValues={record.fields}
        recordId={record.record_id}
        kundenList={kundenList}
        monteureList={monteureList}
        enablePhotoScan={AI_PHOTO_SCAN['Auftraege']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Auftraege']}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title={t('delete_entity', { entity: appLabel('auftraege') })}
        description={t('confirm_delete_desc')}
      />
    </RecordView>
  );
}
