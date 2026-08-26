/**
 * Neuen Auftrag anlegen — 3-Schritt-Wizard.
 * Steps: 1) Kunde wählen → 2) Monteur zuweisen → 3) Auftragsdetails erfassen & anlegen.
 * Reads: kunden, monteure. Writes: auftraege (createAuftraegeEntry).
 * Composes: IntentWizardShell, EntitySelectStep.
 */

import { useState } from 'react';
import { format } from 'date-fns';
import {
  IconUser,
  IconHelmet,
  IconFileText,
  IconCheck,
} from '@tabler/icons-react';
import { IntentWizardShell } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useDashboardData } from '@/hooks/useDashboardData';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import type { Kunden, Monteure } from '@/types/app';
import { tx } from '@/i18n';

const STATUS_OPTIONS = LOOKUP_OPTIONS['auftraege']?.['status'] ?? [];

export default function AuftragAnlegenPage() {
  const { kunden, monteure, loading, error, fetchAll } = useDashboardData();

  const [step, setStep] = useState(1);

  // Step 1 state
  const [selectedKunde, setSelectedKunde] = useState<Kunden | null>(null);
  const [showCreateKunde, setShowCreateKunde] = useState(false);
  const [newKundeVorname, setNewKundeVorname] = useState('');
  const [newKundeNachname, setNewKundeNachname] = useState('');
  const [newKundeTelefon, setNewKundeTelefon] = useState('');

  // Step 2 state
  const [selectedMonteur, setSelectedMonteur] = useState<Monteure | null>(null);
  const [showCreateMonteur, setShowCreateMonteur] = useState(false);
  const [newMonteurVorname, setNewMonteurVorname] = useState('');
  const [newMonteurNachname, setNewMonteurNachname] = useState('');
  const [newMonteurTelefon, setNewMonteurTelefon] = useState('');

  // Step 3 state
  const [strasse, setStrasse] = useState('');
  const [hausnummer, setHausnummer] = useState('');
  const [plz, setPlz] = useState('');
  const [ort, setOrt] = useState('');
  const [beschreibung, setBeschreibung] = useState('');
  const [termin, setTermin] = useState('');
  const [statusKey] = useState(STATUS_OPTIONS[0]?.key ?? 'offen');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSelectKunde = (id: string) => {
    const found = kunden.find((k) => k.record_id === id);
    if (found) {
      setSelectedKunde(found);
      setStep(2);
    }
  };

  const handleCreateKunde = async () => {
    if (!newKundeVorname || !newKundeNachname) return;
    const created = await LivingAppsService.createKundenEntry({
      vorname: newKundeVorname,
      nachname: newKundeNachname,
      telefon: newKundeTelefon || undefined,
    });
    await fetchAll();
    setShowCreateKunde(false);
    setNewKundeVorname('');
    setNewKundeNachname('');
    setNewKundeTelefon('');
    const fresh = kunden.find((k) => k.record_id === created.record_id);
    if (fresh) {
      setSelectedKunde(fresh);
      setStep(2);
    }
  };

  const handleSelectMonteur = (id: string) => {
    const found = monteure.find((m) => m.record_id === id);
    if (found) {
      setSelectedMonteur(found);
      setStep(3);
    }
  };

  const handleCreateMonteur = async () => {
    if (!newMonteurVorname || !newMonteurNachname) return;
    const created = await LivingAppsService.createMonteureEntry({
      monteur_vorname: newMonteurVorname,
      monteur_nachname: newMonteurNachname,
      monteur_telefon: newMonteurTelefon || undefined,
    });
    await fetchAll();
    setShowCreateMonteur(false);
    setNewMonteurVorname('');
    setNewMonteurNachname('');
    setNewMonteurTelefon('');
    const fresh = monteure.find((m) => m.record_id === created.record_id);
    if (fresh) {
      setSelectedMonteur(fresh);
      setStep(3);
    }
  };

  const handleSubmit = async () => {
    if (!selectedKunde || !selectedMonteur || !strasse || !hausnummer || !plz || !ort || !termin) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await LivingAppsService.createAuftraegeEntry({
        kunde: createRecordUrl(APP_IDS.KUNDEN, selectedKunde.record_id),
        monteur: createRecordUrl(APP_IDS.MONTEURE, selectedMonteur.record_id),
        strasse,
        hausnummer,
        plz,
        ort,
        beschreibung: beschreibung || undefined,
        termin,
        status: statusKey,
      });
      setDone(true);
    } catch {
      setSubmitError(tx('Fehler beim Anlegen. Bitte erneut versuchen.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedKunde(null);
    setSelectedMonteur(null);
    setStrasse('');
    setHausnummer('');
    setPlz('');
    setOrt('');
    setBeschreibung('');
    setTermin('');
    setSubmitError(null);
    setDone(false);
    setStep(1);
  };

  const step3Ready = !!(selectedKunde && selectedMonteur);
  const detailsValid = !!(strasse && hausnummer && plz && ort && termin);

  return (
    <IntentWizardShell
      title={tx('Auftrag anlegen')}
      subtitle={tx('Schritt für Schritt zum neuen Auftrag')}
      steps={[
        { label: tx('Kunde wählen') },
        { label: tx('Monteur zuweisen') },
        { label: tx('Auftragsdetails') },
      ]}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* ── Step 1: Kunde wählen ─────────────────────────────────────── */}
      {step === 1 && (
        <EntitySelectStep
          items={kunden.map((k) => ({
            id: k.record_id,
            title: [k.fields.vorname, k.fields.nachname].filter(Boolean).join(' ') || k.record_id,
            subtitle: k.fields.telefon,
            icon: <IconUser size={20} className="text-primary" />,
          }))}
          onSelect={handleSelectKunde}
          createLabel={tx('Neuen Kunden anlegen')}
          onCreateNew={() => setShowCreateKunde(true)}
          searchPlaceholder={tx('Kunden suchen …')}
          emptyText={tx('Kein Kunde gefunden')}
          createDialog={
            showCreateKunde && (
              <div className="rounded-2xl border p-4 space-y-3">
                <p className="text-sm font-medium text-foreground">{tx('Neuen Kunden anlegen')}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="kd-vorname">{tx('Vorname')}</Label>
                    <Input
                      id="kd-vorname"
                      value={newKundeVorname}
                      onChange={(e) => setNewKundeVorname(e.target.value)}
                      placeholder={tx('Vorname')}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="kd-nachname">{tx('Nachname')}</Label>
                    <Input
                      id="kd-nachname"
                      value={newKundeNachname}
                      onChange={(e) => setNewKundeNachname(e.target.value)}
                      placeholder={tx('Nachname')}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="kd-telefon">{tx('Telefon')}</Label>
                  <Input
                    id="kd-telefon"
                    type="tel"
                    value={newKundeTelefon}
                    onChange={(e) => setNewKundeTelefon(e.target.value)}
                    placeholder={tx('Telefonnummer')}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    disabled={!newKundeVorname || !newKundeNachname}
                    onClick={handleCreateKunde}
                  >
                    {tx('Anlegen & auswählen')}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowCreateKunde(false)}>
                    {tx('Abbrechen')}
                  </Button>
                </div>
              </div>
            )
          }
        />
      )}

      {/* ── Step 2: Monteur zuweisen ──────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">
          {selectedKunde && (
            <div className="rounded-xl bg-secondary px-4 py-2 text-sm text-muted-foreground flex items-center gap-2">
              <IconUser size={14} className="shrink-0" />
              <span>
                {tx('Kunde')}: <strong>{[selectedKunde.fields.vorname, selectedKunde.fields.nachname].filter(Boolean).join(' ')}</strong>
              </span>
            </div>
          )}
          {!selectedKunde ? (
            <div className="text-center py-12 space-y-3">
              <p className="text-sm text-muted-foreground">{tx('Dieser Schritt braucht die Auswahl aus Schritt 1.')}</p>
              <Button variant="outline" onClick={() => setStep(1)}>{tx('Neu starten')}</Button>
            </div>
          ) : (
            <EntitySelectStep
              items={monteure.map((m) => ({
                id: m.record_id,
                title: [m.fields.monteur_vorname, m.fields.monteur_nachname].filter(Boolean).join(' ') || m.record_id,
                subtitle: m.fields.monteur_telefon,
                icon: <IconHelmet size={20} className="text-primary" />,
              }))}
              onSelect={handleSelectMonteur}
              createLabel={tx('Neuen Monteur anlegen')}
              onCreateNew={() => setShowCreateMonteur(true)}
              searchPlaceholder={tx('Monteur suchen …')}
              emptyText={tx('Kein Monteur gefunden')}
              createDialog={
                showCreateMonteur && (
                  <div className="rounded-2xl border p-4 space-y-3">
                    <p className="text-sm font-medium text-foreground">{tx('Neuen Monteur anlegen')}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="mt-vorname">{tx('Vorname')}</Label>
                        <Input
                          id="mt-vorname"
                          value={newMonteurVorname}
                          onChange={(e) => setNewMonteurVorname(e.target.value)}
                          placeholder={tx('Vorname')}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="mt-nachname">{tx('Nachname')}</Label>
                        <Input
                          id="mt-nachname"
                          value={newMonteurNachname}
                          onChange={(e) => setNewMonteurNachname(e.target.value)}
                          placeholder={tx('Nachname')}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="mt-telefon">{tx('Telefon')}</Label>
                      <Input
                        id="mt-telefon"
                        type="tel"
                        value={newMonteurTelefon}
                        onChange={(e) => setNewMonteurTelefon(e.target.value)}
                        placeholder={tx('Telefonnummer')}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        disabled={!newMonteurVorname || !newMonteurNachname}
                        onClick={handleCreateMonteur}
                      >
                        {tx('Anlegen & zuweisen')}
                      </Button>
                      <Button variant="ghost" onClick={() => setShowCreateMonteur(false)}>
                        {tx('Abbrechen')}
                      </Button>
                    </div>
                  </div>
                )
              }
            />
          )}
        </div>
      )}

      {/* ── Step 3: Auftragsdetails ───────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-6">
          {!step3Ready ? (
            <div className="text-center py-12 space-y-3">
              <p className="text-sm text-muted-foreground">{tx('Dieser Schritt braucht die Auswahl aus Schritt 1 und 2.')}</p>
              <Button variant="outline" onClick={() => setStep(1)}>{tx('Neu starten')}</Button>
            </div>
          ) : done ? (
            /* ── Success state ── */
            <div className="flex flex-col items-center gap-6 py-12 text-center">
              <div className="rounded-full bg-emerald-100 p-4">
                <IconCheck size={40} className="text-emerald-600" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-foreground">{tx('Auftrag wurde angelegt!')}</p>
                <p className="text-sm text-muted-foreground">
                  {tx('Der Auftrag wurde erfolgreich erstellt und dem Monteur zugewiesen.')}
                </p>
              </div>
              <div className="flex flex-wrap gap-3 justify-center">
                <Button onClick={handleReset}>{tx('Neuen Auftrag anlegen')}</Button>
                <Button variant="outline" asChild>
                  <a href="#/">{tx('Zurück zum Dashboard')}</a>
                </Button>
              </div>
            </div>
          ) : (
            /* ── Detail form ── */
            <div className="space-y-5">
              {/* Context summary */}
              <div className="rounded-xl bg-secondary px-4 py-3 text-sm space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <IconUser size={14} className="shrink-0" />
                  <span>
                    {tx('Kunde')}: <strong className="text-foreground">{[selectedKunde!.fields.vorname, selectedKunde!.fields.nachname].filter(Boolean).join(' ')}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <IconHelmet size={14} className="shrink-0" />
                  <span>
                    {tx('Monteur')}: <strong className="text-foreground">{[selectedMonteur!.fields.monteur_vorname, selectedMonteur!.fields.monteur_nachname].filter(Boolean).join(' ')}</strong>
                  </span>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground flex items-center gap-2">
                  <IconFileText size={16} className="shrink-0 text-muted-foreground" />
                  {tx('Adresse der Baustelle')}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <Label htmlFor="strasse">{tx('Straße')}</Label>
                    <Input
                      id="strasse"
                      value={strasse}
                      onChange={(e) => setStrasse(e.target.value)}
                      placeholder={tx('Straße')}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="hausnummer">{tx('Hausnummer')}</Label>
                    <Input
                      id="hausnummer"
                      value={hausnummer}
                      onChange={(e) => setHausnummer(e.target.value)}
                      placeholder={tx('Nr.')}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="plz">{tx('PLZ')}</Label>
                    <Input
                      id="plz"
                      value={plz}
                      onChange={(e) => setPlz(e.target.value)}
                      placeholder={tx('PLZ')}
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <Label htmlFor="ort">{tx('Ort')}</Label>
                    <Input
                      id="ort"
                      value={ort}
                      onChange={(e) => setOrt(e.target.value)}
                      placeholder={tx('Ort')}
                    />
                  </div>
                </div>
              </div>

              {/* Termin */}
              <div className="space-y-1">
                <Label htmlFor="termin">{tx('Termin')}</Label>
                <Input
                  id="termin"
                  type="datetime-local"
                  value={termin}
                  onChange={(e) => setTermin(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">{tx('Datum und Uhrzeit des Einsatzes')}</p>
              </div>

              {/* Beschreibung */}
              <div className="space-y-1">
                <Label htmlFor="beschreibung">{tx('Beschreibung')}</Label>
                <Textarea
                  id="beschreibung"
                  value={beschreibung}
                  onChange={(e) => setBeschreibung(e.target.value)}
                  placeholder={tx('Was soll gemacht werden?')}
                  rows={4}
                />
              </div>

              {/* Error */}
              {submitError && (
                <p className="text-sm text-destructive">{submitError}</p>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                <Button
                  disabled={!detailsValid || submitting}
                  onClick={handleSubmit}
                >
                  {submitting ? tx('Wird angelegt …') : tx('Auftrag anlegen')}
                </Button>
                <Button variant="outline" onClick={() => setStep(2)} disabled={submitting}>
                  {tx('Zurück')}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </IntentWizardShell>
  );
}
