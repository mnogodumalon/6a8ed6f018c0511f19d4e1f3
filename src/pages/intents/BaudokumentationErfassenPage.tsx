/**
 * Baudokumentation erfassen — 2-Schritt-Wizard.
 * Steps: 1) Auftrag wählen (nur offen/in_arbeit) → 2) Foto, Notiz & Datum erfassen → Anlegen.
 * Reads: auftraege, kundenMap, monteureMap. Writes: baudokumentation (createBaudokumentationEntry).
 * Composes: IntentWizardShell, EntitySelectStep, StatusBadge.
 */
import { useState } from 'react';
import { format } from 'date-fns';
import { IconCamera, IconFileDescription } from '@tabler/icons-react';
import { tx } from '@/i18n';
import { APP_IDS } from '@/types/app';
import type { EnrichedAuftraege } from '@/types/enriched';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichAuftraege } from '@/lib/enrich';
import { formatDate } from '@/lib/formatters';
import { IntentWizardShell } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { StatusBadge } from '@/components/blocks/StatusBadge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function BaudokumentationErfassenPage() {
  const { auftraege, kundenMap, monteureMap, loading, error, fetchAll } = useDashboardData();

  const [step, setStep] = useState(1);
  const [selectedAuftrag, setSelectedAuftrag] = useState<EnrichedAuftraege | null>(null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [notiz, setNotiz] = useState('');
  const [aufnahmedatum, setAufnahmedatum] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const enrichedAuftraege = enrichAuftraege(auftraege, { kundenMap, monteureMap });
  const eligibleAuftraege = enrichedAuftraege.filter(
    a => a.fields.status?.key === 'offen' || a.fields.status?.key === 'in_arbeit'
  );

  const handleAuftragSelect = (id: string) => {
    const found = eligibleAuftraege.find(a => a.record_id === id) ?? null;
    setSelectedAuftrag(found);
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!selectedAuftrag || !fotoFile) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await LivingAppsService.createBaudokumentationEntry({
        auftrag: createRecordUrl(APP_IDS.AUFTRAEGE, selectedAuftrag.record_id),
        foto: fotoFile as unknown as string,
        notiz: notiz || undefined,
        aufnahmedatum,
      });
      await fetchAll();
      setDone(true);
    } catch {
      setSubmitError(tx('Fehler beim Speichern. Bitte erneut versuchen.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedAuftrag(null);
    setFotoFile(null);
    setNotiz('');
    setAufnahmedatum(format(new Date(), 'yyyy-MM-dd'));
    setSubmitError(null);
    setDone(false);
  };

  if (done) {
    return (
      <IntentWizardShell
        title={tx('Baudokumentation erfassen')}
        subtitle={tx('Foto und Notiz zur Baustelle ablegen')}
        steps={[{ label: tx('Auftrag') }, { label: tx('Foto & Notiz') }]}
        currentStep={2}
        onStepChange={setStep}
        loading={loading}
        error={error}
        onRetry={fetchAll}
      >
        <div className="flex flex-col items-center gap-6 py-16 text-center">
          <div className="rounded-full bg-emerald-100 p-4">
            <IconFileDescription size={48} className="text-emerald-600" stroke={1.5} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">{tx('Dokumentation gespeichert')}</h2>
            <p className="text-sm text-muted-foreground">
              {tx('Das Baustellenfoto wurde erfolgreich zum Auftrag abgelegt.')}
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <Button onClick={handleReset} variant="default">
              {tx('Neue Dokumentation erfassen')}
            </Button>
            <a href="#/" className="text-sm text-center text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">
              {tx('Zurück zum Dashboard')}
            </a>
          </div>
        </div>
      </IntentWizardShell>
    );
  }

  return (
    <IntentWizardShell
      title={tx('Baudokumentation erfassen')}
      subtitle={tx('Foto und Notiz zur Baustelle ablegen')}
      steps={[{ label: tx('Auftrag') }, { label: tx('Foto & Notiz') }]}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {step === 1 && (
        <EntitySelectStep
          items={eligibleAuftraege.map(a => ({
            id: a.record_id,
            title: [a.fields.auftragsnummer, a.kundeName].filter(Boolean).join(' · ') || a.record_id,
            subtitle: [a.fields.strasse, a.fields.ort].filter(Boolean).join(', '),
            status: a.fields.status
              ? { key: a.fields.status.key, label: a.fields.status.label }
              : undefined,
          }))}
          onSelect={handleAuftragSelect}
          searchPlaceholder={tx('Auftrag suchen …')}
          emptyText={tx('Keine offenen oder laufenden Aufträge gefunden')}
          emptyIcon={<IconFileDescription size={32} className="text-muted-foreground" stroke={1.5} />}
        />
      )}

      {step === 2 && (
        selectedAuftrag ? (
          <div className="space-y-6">
            {/* Auftrag-Kontext */}
            <div className="rounded-2xl border bg-secondary/40 p-4 flex items-start gap-3">
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-xs text-muted-foreground">{tx('Auftrag')}</p>
                <p className="font-medium truncate">
                  {[selectedAuftrag.fields.auftragsnummer, selectedAuftrag.kundeName]
                    .filter(Boolean)
                    .join(' · ') || selectedAuftrag.record_id}
                </p>
                {(selectedAuftrag.fields.strasse || selectedAuftrag.fields.ort) && (
                  <p className="text-sm text-muted-foreground truncate">
                    {[selectedAuftrag.fields.strasse, selectedAuftrag.fields.ort]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                )}
              </div>
              {selectedAuftrag.fields.status && (
                <StatusBadge
                  statusKey={selectedAuftrag.fields.status.key}
                  label={selectedAuftrag.fields.status.label}
                />
              )}
            </div>

            {/* Formular */}
            <div className="space-y-5">
              {/* Foto-Upload */}
              <div className="space-y-2">
                <Label htmlFor="foto-input" className="font-medium">
                  {tx('Baustellenfoto')}
                  <span className="text-destructive ml-1">*</span>
                </Label>
                {fotoFile ? (
                  <div className="rounded-2xl border bg-card p-4 flex items-center gap-3">
                    <div className="rounded-xl bg-primary/10 p-2">
                      <IconCamera size={20} className="text-primary shrink-0" stroke={1.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{fotoFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(fotoFile.size / 1024).toFixed(0)} {tx('KB')}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFotoFile(null)}
                      className="shrink-0 text-muted-foreground"
                    >
                      {tx('Ändern')}
                    </Button>
                  </div>
                ) : (
                  <label
                    htmlFor="foto-input"
                    className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-muted-foreground/30 p-8 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                  >
                    <IconCamera size={36} className="text-muted-foreground" stroke={1.5} />
                    <div className="text-center">
                      <p className="text-sm font-medium">{tx('Foto aufnehmen oder auswählen')}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {tx('Kamera oder Galerie')}
                      </p>
                    </div>
                    <input
                      id="foto-input"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="sr-only"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) setFotoFile(file);
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Aufnahmedatum */}
              <div className="space-y-2">
                <Label htmlFor="aufnahmedatum-input" className="font-medium">
                  {tx('Aufnahmedatum')}
                  <span className="text-destructive ml-1">*</span>
                </Label>
                <Input
                  id="aufnahmedatum-input"
                  type="date"
                  value={aufnahmedatum}
                  onChange={e => setAufnahmedatum(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Notiz */}
              <div className="space-y-2">
                <Label htmlFor="notiz-input" className="font-medium">
                  {tx('Notiz')}
                  <span className="text-xs text-muted-foreground ml-2">{tx('(optional)')}</span>
                </Label>
                <Textarea
                  id="notiz-input"
                  value={notiz}
                  onChange={e => setNotiz(e.target.value)}
                  placeholder={tx('Kurze Beschreibung zum Foto …')}
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>

            {/* Fehlermeldung */}
            {submitError && (
              <p className="text-sm text-destructive rounded-xl bg-destructive/10 px-4 py-3">
                {submitError}
              </p>
            )}

            {/* Aktionen */}
            <div className="flex flex-col gap-3 pt-2">
              <Button
                onClick={handleSubmit}
                disabled={!fotoFile || !aufnahmedatum || submitting}
                className="w-full"
              >
                {submitting ? tx('Wird gespeichert …') : tx('Dokumentation speichern')}
              </Button>
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                disabled={submitting}
                className="w-full"
              >
                {tx('Zurück zur Auftragsauswahl')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {tx('Dieser Schritt braucht die Auswahl aus Schritt 1.')}
            </p>
            <Button variant="outline" onClick={() => setStep(1)}>
              {tx('Neu starten')}
            </Button>
          </div>
        )
      )}
    </IntentWizardShell>
  );
}
