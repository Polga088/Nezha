'use client';

import { useState, useRef, use, useEffect, useCallback, useMemo } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  FileText, CreditCard, Plus, X, Download, Copy,
  Activity, AlertTriangle, FileBadge, History, MapPin, Phone, Mail, File as FileIcon, Calendar, Stethoscope, TrendingUp, CalendarPlus, ShieldCheck,
  Receipt,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale/fr';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BillingModal } from '@/components/patients/BillingModal';
import { useSettings } from '@/hooks/useSettings';
import { currencyAmountSuffix } from '@/lib/currency-amount-suffix';
import { ShareDocument } from '@/components/patients/ShareDocument';
import { PatientClinicalAlerts } from '@/components/patients/PatientClinicalAlerts';
import { PatientClinicalSmartSummary } from '@/components/patients/PatientClinicalSmartSummary';
import { PrescriptionForm, type RenewPrescriptionPayload } from '@/components/prescriptions/PrescriptionForm';
import { PatientQuickPrescriptionForm } from '@/components/prescriptions/PatientQuickPrescriptionForm';
import {
  PatientPrescriptionList,
  type PatientPrescriptionRow,
} from '@/components/patients/PatientPrescriptionList';
import { ConsultationEditor } from '@/components/patients/ConsultationEditor';
import { DoctorConsultationActions } from '@/components/doctor/DoctorConsultationActions';
import { APPOINTMENT_STATUS_LABEL } from '@/lib/appointment-status';
import { VitalsChart } from '@/components/patients/VitalsChart';
import { ConsultationForm } from '@/components/patients/ConsultationForm';
import {
  ConsultationHistory,
  type PatientConsultationRow,
} from '@/components/patients/ConsultationHistory';
import { VitalsAnalytics } from '@/components/patients/VitalsAnalytics';
import { ImageUpload } from '@/components/patients/ImageUpload';
import { PatientBioEditableField } from '@/components/patients/PatientBioEditableField';
import { parseMedicamentsJson } from '@/lib/prescription-types';
import {
  ASSURANCE_TYPE_LABELS,
  ASSURANCE_TYPE_VALUES,
  assuranceTypeBadgeClassName,
  hasDeclaredAssurance,
} from '@/lib/assurance-types';
import type { AssuranceTypeValue } from '@/lib/assurance-types';

import styles from './patient.module.css';

// Utilitaires de calcul
function calculateAge(dateString: string | null | undefined) {
  if (!dateString) return 'N/A';
  const today = new Date();
  const birthDate = new Date(dateString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function calculateIMC(poids?: number | null, taille?: number | null) {
  if (!poids || !taille) return 'N/A';
  const tailleEnMetre = taille / 100;
  const imc = poids / (tailleEnMetre * tailleEnMetre);
  return imc.toFixed(1);
}

/** IMC = poids(kg) / taille(m)² — taille en cm */
function imcFromCmKg(tailleCm: number, poidsKg: number): number {
  const m = tailleCm / 100;
  if (m <= 0 || !Number.isFinite(m)) return 0;
  return poidsKg / (m * m);
}

function getImcStatus(imcVal: string) {
  if (imcVal === 'N/A') return 'N/A';
  const v = parseFloat(imcVal);
  if (v < 18.5) return 'Insuffisance pondérale';
  if (v < 25) return 'Poids normal';
  if (v < 30) return 'Surpoids';
  return 'Obésité';
}

function getImcColor(imcVal: string) {
  if (imcVal === 'N/A') return 'text-slate-500';
  const v = parseFloat(imcVal);
  if (v < 18.5) return 'text-orange-500';
  if (v < 25) return 'text-emerald-500';
  if (v < 30) return 'text-orange-500';
  return 'text-red-500';
}

const INVOICE_MODE_LABEL: Record<string, string> = {
  CASH: 'Espèces',
  CARD: 'Carte',
  CHECK: 'Chèque',
}

const INVOICE_STATUT_LABEL: Record<string, string> = {
  PENDING: 'En attente',
  PAID: 'Payé',
  CANCELLED: 'Annulé',
}

export default function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { settings: cabinetMoneySettings } = useSettings(true);
  const patientInvoiceSuffix = currencyAmountSuffix(
    cabinetMoneySettings?.currency?.trim() || 'EUR'
  );
  
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // States
  const [activeTab, setActiveTab] = useState('historique');
  /** Notes du dernier RDV — synchronisées avec `ConsultationEditor` (saisie + dictée) */
  const [notesForAlerts, setNotesForAlerts] = useState('');
  
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  
  const [prescriptions, setPrescriptions] = useState<PatientPrescriptionRow[]>([]);
  const [renewPrescriptionPayload, setRenewPrescriptionPayload] =
    useState<RenewPrescriptionPayload>(null);
  const [invoiceData, setInvoiceData] = useState({
    montant: '0',
    methode: 'Carte',
    currency: 'EUR',
  });
  const [documents, setDocuments] = useState<any[]>([]);
  const [patientUploadedDocs, setPatientUploadedDocs] = useState<
    Array<{
      id: string;
      filename: string;
      mimeType: string | null;
      file_url: string | null;
      label: string | null;
      createdAt: string;
    }>
  >([]);

  type VitalEntryRow = {
    id: string;
    patient_id: string;
    recordedAt: string;
    tailleCm: number;
    poidsKg: number;
    imc: number;
  };
  const [vitalEntries, setVitalEntries] = useState<VitalEntryRow[]>([]);
  const [vitalFormTaille, setVitalFormTaille] = useState('');
  const [vitalFormPoids, setVitalFormPoids] = useState('');
  const [vitalFormDate, setVitalFormDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [vitalSaving, setVitalSaving] = useState(false);

  const [consultations, setConsultations] = useState<PatientConsultationRow[]>([]);

  const latestDiagnostic = useMemo(() => {
    const sorted = [...consultations].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    for (const c of sorted) {
      const d = c.diagnostic?.trim();
      if (d) return d;
    }
    return '';
  }, [consultations]);

  const patientDisplayName = useMemo(
    () =>
      patient
        ? [patient.prenom, patient.nom].filter(Boolean).join(' ').trim() ||
          patient.nom ||
          'Patient'
        : 'Patient',
    [patient]
  );

  const handleRenewPrescription = useCallback((rx: PatientPrescriptionRow) => {
    const m = parseMedicamentsJson(rx.medicaments) ?? [];
    setRenewPrescriptionPayload({
      medicaments: m,
      conseils: rx.conseils,
      diagnosticAssocie: rx.diagnosticAssocie ?? null,
    });
    setIsPrescriptionModalOpen(true);
  }, []);

  const fileImportRef = useRef<HTMLInputElement>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const refetchPatient = useCallback(async () => {
    try {
      const res = await fetch(`/api/patients/${resolvedParams.id}`);
      if (!res.ok) throw new Error('Patient not found');
      const data = await res.json();
      setPatient(data);
      if (Array.isArray(data.patientDocuments)) {
        setPatientUploadedDocs(data.patientDocuments);
      }
    } catch (err) {
      console.error(err);
    }
  }, [resolvedParams.id]);

  useEffect(() => {
    setLoading(true);
    void refetchPatient().finally(() => setLoading(false));
  }, [refetchPatient]);

  const fetchVitals = useCallback(async () => {
    try {
      const res = await fetch(`/api/patients/${resolvedParams.id}/vitals`);
      if (!res.ok) return;
      const data = await res.json();
      setVitalEntries(Array.isArray(data) ? data : []);
    } catch {
      setVitalEntries([]);
    }
  }, [resolvedParams.id]);

  useEffect(() => {
    fetchVitals();
  }, [fetchVitals]);

  const fetchConsultations = useCallback(async () => {
    try {
      const res = await fetch(`/api/patients/${resolvedParams.id}/consultations`);
      if (!res.ok) return;
      const data = await res.json();
      setConsultations(Array.isArray(data) ? data : []);
    } catch {
      setConsultations([]);
    }
  }, [resolvedParams.id]);

  useEffect(() => {
    fetchConsultations();
  }, [fetchConsultations]);

  useEffect(() => {
    if (!patient) return;
    setVitalFormTaille(
      patient.taille != null ? String(patient.taille) : ''
    );
    setVitalFormPoids(patient.poids != null ? String(patient.poids) : '');
  }, [patient?.id, patient?.taille, patient?.poids]);

  const fetchPrescriptions = useCallback(async () => {
    if (!resolvedParams.id) return;
    try {
      const res = await fetch(`/api/patients/${resolvedParams.id}/prescriptions`, {
        credentials: 'same-origin',
      });
      if (!res.ok) return;
      const data = await res.json();
      setPrescriptions(Array.isArray(data) ? data : []);
    } catch {
      setPrescriptions([]);
    }
  }, [resolvedParams.id]);

  useEffect(() => {
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  const handleImportDocument = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file || !patient?.id) return;

      const fd = new FormData();
      fd.append('file', file);

      try {
        const res = await fetch(`/api/patients/${patient.id}/documents`, {
          method: 'POST',
          body: fd,
        });
        const raw = await res.text();
        if (!res.ok) {
          let msg = raw;
          try {
            const j = JSON.parse(raw) as { error?: string };
            if (j.error) msg = j.error;
          } catch {
            /* brut */
          }
          toast.error(`[${res.status}] ${msg}`);
          return;
        }
        const doc = JSON.parse(raw) as (typeof patientUploadedDocs)[0];
        setPatientUploadedDocs((prev) => [doc, ...prev]);
        toast.success(`Document importé : ${file.name}`);
      } catch (err) {
        console.error(err);
        toast.error('Échec de l’import');
      }
    },
    [patient?.id]
  );

  const generatePDF = async (elementRef: React.RefObject<HTMLDivElement | null>, nomFichier: string) => {
    if (!elementRef.current || !patient) return;
    
    const element = elementRef.current;
    element.style.left = '0';
    element.style.top = '0';
    element.style.zIndex = '-1';
    
    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${nomFichier}_${patient.nom}.pdf`);
    } catch (e) {
      console.error("Erreur PDF:", e);
    } finally {
      element.style.left = '-9999px';
      element.style.top = '-9999px';
    }
  };

  const handleSaveInvoice = async () => {
    await generatePDF(invoiceRef, 'Facture');
    setDocuments([
      ...documents,
      {
        type: 'Facture',
        date: new Date().toLocaleDateString(),
        montant: `${invoiceData.montant} ${invoiceData.currency}`,
      },
    ]);
    setIsInvoiceModalOpen(false);
  };

  const evolutionChartData = useMemo(() => {
    if (!patient) return [];
    const sorted = [...vitalEntries].sort(
      (a, b) =>
        new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
    );
    if (sorted.length > 0) {
      return sorted.map((v) => ({
        dateLabel: format(new Date(v.recordedAt), 'dd/MM/yyyy', {
          locale: fr,
        }),
        poidsKg: v.poidsKg,
        imc: Math.round(v.imc * 10) / 10,
      }));
    }
    const t = patient.taille;
    const p = patient.poids;
    if (t != null && p != null && Number(t) > 0 && Number(p) > 0) {
      const imc = imcFromCmKg(Number(t), Number(p));
      return [
        {
          dateLabel: 'Dossier actuel',
          poidsKg: Number(p),
          imc: Math.round(imc * 10) / 10,
        },
      ];
    }
    return [];
  }, [vitalEntries, patient]);

  const handleAddVitalMeasurement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient?.id) return;
    const t = parseFloat(vitalFormTaille.replace(/,/g, '.'));
    const p = parseFloat(vitalFormPoids.replace(/,/g, '.'));
    if (!Number.isFinite(t) || !Number.isFinite(p)) {
      toast.error('Indiquez une taille (cm) et un poids (kg) valides.');
      return;
    }

    setVitalSaving(true);
    try {
      const recordedAt = new Date(`${vitalFormDate}T12:00:00`);
      const res = await fetch(`/api/patients/${patient.id}/vitals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tailleCm: t,
          poidsKg: p,
          recordedAt: recordedAt.toISOString(),
        }),
      });
      const raw = await res.text();
      if (!res.ok) {
        let msg = raw;
        try {
          const j = JSON.parse(raw) as { error?: string };
          if (j.error) msg = j.error;
        } catch {
          /* */
        }
        toast.error(msg);
        return;
      }
      await fetchVitals();
      setPatient((prev: any) =>
        prev ? { ...prev, taille: t, poids: p } : prev
      );
      toast.success('Mesure enregistrée — courbe mise à jour.');
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de l’enregistrement.');
    } finally {
      setVitalSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 animate-pulse">Chargement du dossier médical...</div>;
  }

  if (!patient?.id) {
    return <div className="p-8 text-center text-red-500">Dossier introuvable.</div>;
  }

  const primaryAppointment = patient.appointments?.[0] as
    | {
        id: string;
        consultation?: { notes_medecin: string | null; diagnostic: string | null } | null;
      }
    | undefined;
  const initialConsultationNotes = primaryAppointment?.consultation?.notes_medecin ?? '';
  const initialConsultationDiagnostic = primaryAppointment?.consultation?.diagnostic ?? '';

  const age = calculateAge(patient.date_naissance);
  const imc = calculateIMC(patient.poids, patient.taille);
  const imcStatus = getImcStatus(imc);

  const rawAssurance = patient.assuranceType ?? 'AUCUNE';
  const assuranceTypeKey: AssuranceTypeValue = (
    ASSURANCE_TYPE_VALUES as readonly string[]
  ).includes(rawAssurance)
    ? (rawAssurance as AssuranceTypeValue)
    : 'AUTRE';

  const handleCopyMatriculeAssurance = async () => {
    const m = patient.matriculeAssurance?.trim();
    if (!m) return;
    try {
      await navigator.clipboard.writeText(m);
      toast.success('Matricule copié dans le presse-papiers');
    } catch {
      toast.error('Impossible de copier le matricule');
    }
  };

  return (
    <div className="animate-fade-in flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto items-start">
      
      {/* 1. Header & Sidebar Latérale (Profil Fixe) */}
      <div className="w-full lg:w-1/3 flex flex-col gap-6">
        <Card className="shadow-sm border-slate-200/60 overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
          <CardContent className="pt-0 relative px-6 pb-6">
            <div className="flex justify-center -mt-12 mb-4">
              <Avatar className="h-24 w-24 border-4 border-white shadow-sm bg-blue-50 text-blue-600">
                <AvatarFallback className="text-3xl font-bold">
                  {patient.prenom[0]}{patient.nom[0]}
                </AvatarFallback>
              </Avatar>
            </div>
            
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {patient.prenom} <span className="uppercase">{patient.nom}</span>
              </h1>
              <p className="text-slate-500 font-medium mt-1">
                {patient.sexe === 'MASCULIN' ? 'Homme' : patient.sexe === 'FEMININ' ? 'Femme' : ''} • {age} ans
              </p>
              {patient.cin && (
                <Badge variant="outline" className="mt-3 text-xs text-slate-500 border-slate-200">
                  CIN: {patient.cin}
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
              {patient.groupeSanguin && (
                <Badge className={`px-3 py-1 ${patient.groupeSanguin === 'O-' ? 'bg-red-100 text-red-700 hover:bg-red-200 border-red-200' : 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200'}`} variant="outline">
                  🩸 {patient.groupeSanguin}
                </Badge>
              )}
              {patient.allergies && (
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 px-3 py-1">
                  <AlertTriangle className="w-3 h-3 mr-1 inline-block" />
                  Allergies
                </Badge>
              )}
            </div>

            <Button
              asChild
              className="w-full gap-2 bg-gradient-to-b from-blue-500 to-blue-600 hover:brightness-95 text-white shadow-md border border-blue-600/20"
            >
              <Link
                href={`/dashboard/agenda?${new URLSearchParams({
                  patient_id: patient.id,
                  patient_name: `${patient.prenom} ${patient.nom}`.trim(),
                  ...(patient.tel
                    ? { patient_tel: String(patient.tel) }
                    : {}),
                }).toString()}`}
              >
                <CalendarPlus className="w-4 h-4 shrink-0" />
                Planifier un RDV
              </Link>
            </Button>

            <Separator className="mb-6 bg-slate-100" />

            {/* Constantes vitales */}
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              Constantes Physiques
            </h3>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex flex-col items-center">
                <span className="text-xs text-slate-500 font-medium">Taille</span>
                <span className="text-lg font-bold text-slate-800">{patient.taille ? `${patient.taille} cm` : '--'}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex flex-col items-center">
                <span className="text-xs text-slate-500 font-medium">Poids</span>
                <span className="text-lg font-bold text-slate-800">{patient.poids ? `${patient.poids} kg` : '--'}</span>
              </div>
              <div className="col-span-2 bg-slate-50 p-3 rounded-lg border border-slate-100 flex justify-between items-center px-4">
                <span className="text-sm text-slate-600 font-medium">IMC</span>
                <div className="text-right">
                  <span className={`text-lg font-bold ${getImcColor(imc)}`}>{imc}</span>
                  <span className={`block text-xs font-semibold ${getImcColor(imc)}`}>{imcStatus}</span>
                </div>
              </div>
            </div>

            <Separator className="mb-6 bg-slate-100" />

            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" aria-hidden />
              Couverture sociale
            </h3>
            <div className="rounded-xl border border-outline-variant/15 bg-container-lowest p-4 shadow-medical mb-6">
              {!hasDeclaredAssurance(patient.assuranceType) ? (
                <p className="text-sm text-slate-500">Aucune couverture déclarée</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`px-2.5 py-0.5 font-semibold ${assuranceTypeBadgeClassName(assuranceTypeKey)}`}
                    >
                      {ASSURANCE_TYPE_LABELS[assuranceTypeKey]}
                    </Badge>
                  </div>
                  {patient.matriculeAssurance?.trim() ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between rounded-lg border border-outline-variant/10 bg-container-low/50 px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-slate-500">Matricule</p>
                        <p className="font-mono text-sm text-slate-900 tabular-nums break-all">
                          {patient.matriculeAssurance.trim()}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0 gap-1.5 border-outline-variant/20 bg-container-lowest hover:bg-container-low"
                        onClick={() => void handleCopyMatriculeAssurance()}
                        aria-label={"Copier le matricule d'assurance"}
                      >
                        <Copy className="h-3.5 w-3.5" aria-hidden />
                        Copier
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">Matricule non renseigné</p>
                  )}
                </div>
              )}
            </div>

            <Separator className="mb-6 bg-slate-100" />

            {/* Coordonnées */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-slate-400 mt-1" />
                <div>
                  <p className="text-xs font-medium text-slate-500">Téléphone</p>
                  <p className="text-sm text-slate-800 font-medium">{patient.tel || 'Non renseigné'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-slate-400 mt-1" />
                <div>
                  <p className="text-xs font-medium text-slate-500">Email</p>
                  <p className="text-sm text-slate-800 font-medium">{patient.email || 'Non renseigné'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-slate-400 mt-1" />
                <div>
                  <p className="text-xs font-medium text-slate-500">Adresse</p>
                  <p className="text-sm text-slate-800 font-medium leading-relaxed">{patient.adresse || 'Non renseignée'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. Résumé clinique 360 + onglets */}
      <div className="w-full lg:w-2/3">
        <Card className="mb-6 border-slate-200/80 shadow-premium overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-blue-50/40 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-blue-600" />
              Résumé clinique
            </CardTitle>
            <CardDescription>
              Alertes issues des notes, synthèse de la dernière consultation, courbes poids / IMC, historique
              structuré glycémie — TA — BPM et diagnostics.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5 space-y-5">
            <PatientClinicalSmartSummary appointments={patient.appointments} />
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Alertes</p>
              <PatientClinicalAlerts
                notes={notesForAlerts}
                allergies={patient.allergies}
                antecedents={patient.antecedents}
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Évolution — poids & tension
              </p>
              <VitalsChart vitalEntries={vitalEntries} appointments={patient.appointments ?? []} />
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200/80 bg-white/80 p-4 shadow-sm">
                <VitalsAnalytics consultations={consultations} />
              </div>
              <ConsultationHistory
                consultations={consultations}
                headerAction={
                  patient?.id ? (
                    <ConsultationForm
                      patientId={patient.id}
                      onSaved={() => void fetchConsultations()}
                    />
                  ) : null
                }
              />
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="historique" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 bg-white border border-slate-200/60 shadow-sm p-1 rounded-xl h-auto mb-6 gap-1">
            <TabsTrigger value="historique" className="rounded-lg data-[state=active]:bg-slate-100 data-[state=active]:text-blue-600 data-[state=active]:shadow-none py-2.5 font-semibold transition-all text-xs sm:text-sm">
              <History className="w-4 h-4 sm:mr-2 shrink-0" />
              <span className="truncate">Historique</span>
            </TabsTrigger>
            <TabsTrigger value="medical" className="rounded-lg data-[state=active]:bg-slate-100 data-[state=active]:text-blue-600 data-[state=active]:shadow-none py-2.5 font-semibold transition-all text-xs sm:text-sm">
              <Stethoscope className="w-4 h-4 sm:mr-2 shrink-0" />
              <span className="truncate hidden sm:inline">Bio & Médical</span>
              <span className="truncate sm:hidden">Bio</span>
            </TabsTrigger>
            <TabsTrigger value="evolution" className="rounded-lg data-[state=active]:bg-slate-100 data-[state=active]:text-blue-600 data-[state=active]:shadow-none py-2.5 font-semibold transition-all text-xs sm:text-sm">
              <TrendingUp className="w-4 h-4 sm:mr-2 shrink-0" />
              Évolution
            </TabsTrigger>
            <TabsTrigger value="documents" className="rounded-lg data-[state=active]:bg-slate-100 data-[state=active]:text-blue-600 data-[state=active]:shadow-none py-2.5 font-semibold transition-all text-xs sm:text-sm">
              <FileIcon className="w-4 h-4 sm:mr-2 shrink-0" />
              Documents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="historique" className="m-0 mt-0 focus-visible:outline-none focus-visible:ring-0">
            <Card className="shadow-sm border-slate-200/60">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-5">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-500" />
                  Chronologie des Consultations
                </CardTitle>
                <CardDescription>
                  Retrouvez l'ensemble des rendez-vous et interventions associés à ce patient.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                 {patient.appointments?.length > 0 ? (
                   <div className="space-y-6">
                     {patient.appointments.map((app: any) => (
                       <div key={app.id} className="flex gap-4 relative">
                          <div className="flex flex-col items-center">
                             <div className="w-3 h-3 bg-blue-500 rounded-full mt-1.5 shadow-[0_0_0_4px_rgba(59,130,246,0.1)]"></div>
                             <div className="w-px h-full bg-slate-200 my-2"></div>
                          </div>
                          <div className="flex-1 bg-white border border-slate-100 shadow-sm rounded-xl p-4 hover:shadow-md transition-shadow">
                             <div className="flex justify-between items-start mb-2">
                               <div>
                                 <h4 className="font-bold text-slate-800">
                                   {new Date(app.date_heure).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}
                                 </h4>
                                 <p className="text-sm text-slate-500">{new Date(app.date_heure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                               </div>
                               <Badge
                                 variant={(app.statut ?? app.status) === 'PAID' ? 'default' : 'secondary'}
                                 className={
                                   (app.statut ?? app.status) === 'PAID'
                                     ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none'
                                     : ''
                                 }
                               >
                                 {APPOINTMENT_STATUS_LABEL[app.statut ?? app.status] ??
                                   (app.statut ?? app.status)}
                               </Badge>
                             </div>
                             <p className="text-sm text-slate-700 mb-4">{app.motif}</p>
                             <div className="flex gap-2">
                                <Button size="sm" variant="outline" className="text-xs h-8 text-slate-600" onClick={() => setIsInvoiceModalOpen(true)}>
                                  <CreditCard className="w-3 h-3 mr-2" />
                                  Facturer
                                </Button>
                             </div>
                          </div>
                       </div>
                     ))}
                   </div>
                 ) : (
                    <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                      <p className="text-slate-500 font-medium">Aucun rendez-vous dans l'historique.</p>
                    </div>
                 )}
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200/60 mt-6">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-5">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-600" />
                  Historique des paiements
                </CardTitle>
                <CardDescription>
                  Encaissements enregistrés pour ce patient (liés ou non à un rendez-vous).
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {patient?.invoices?.length > 0 ? (
                  <ul className="space-y-3" aria-label="Liste des factures">
                    {patient.invoices.map((inv: {
                      id: string
                      montant: number
                      statut: string
                      modePaiement: string
                      createdAt: string
                      datePaiement: string | null
                      sharingToken: string
                      appointmentId: string | null
                      appointment: { id: string; date_heure: string; motif: string } | null
                    }) => (
                      <li
                        key={inv.id}
                        className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-slate-100 bg-white p-4 shadow-sm"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-slate-800">
                              {inv.montant.toFixed(2)} {patientInvoiceSuffix}
                            </span>
                            <Badge
                              variant={inv.statut === 'PAID' ? 'default' : 'secondary'}
                              className={
                                inv.statut === 'PAID'
                                  ? 'bg-emerald-100 text-emerald-800 border-none'
                                  : ''
                              }
                            >
                              {INVOICE_STATUT_LABEL[inv.statut] ?? inv.statut}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600">
                            {INVOICE_MODE_LABEL[inv.modePaiement] ?? inv.modePaiement}
                            {' · '}
                            {format(new Date(inv.createdAt), 'dd MMM yyyy HH:mm', { locale: fr })}
                          </p>
                          {inv.appointment && (
                            <p className="text-xs text-slate-500">
                              RDV :{' '}
                              {format(new Date(inv.appointment.date_heure), 'dd/MM/yyyy HH:mm', {
                                locale: fr,
                              })}{' '}
                              — {inv.appointment.motif}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <ShareDocument
                            patientName={patientDisplayName}
                            sharingToken={inv.sharingToken}
                            label="Lien patient"
                            size="sm"
                            variant="outline"
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    <p className="text-slate-500 font-medium">Aucun paiement enregistré pour ce dossier.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="medical" className="m-0 mt-0 focus-visible:outline-none focus-visible:ring-0">
            <div className="grid gap-6">
              <DoctorConsultationActions
                appointments={patient.appointments ?? []}
                onUpdated={refetchPatient}
              />
              <ConsultationEditor
                appointmentId={primaryAppointment?.id ?? null}
                initialNotesMedecin={initialConsultationNotes}
                initialDiagnostic={initialConsultationDiagnostic}
                onNotesPreviewChange={setNotesForAlerts}
                onSaved={refetchPatient}
                headerAction={
                  <Button
                    onClick={() => {
                      setRenewPrescriptionPayload(null);
                      setIsPrescriptionModalOpen(true);
                    }}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md hover:brightness-110"
                  >
                    <FileText className="w-4 h-4 mr-2" /> Ordonnance
                  </Button>
                }
              />

              {patient?.id ? (
                <PatientQuickPrescriptionForm
                  patientId={patient.id}
                  onSaved={(rxId) => {
                    void fetchPrescriptions();
                    window.open(
                      `/dashboard/patients/${patient.id}/prescriptions/${rxId}/print`,
                      '_blank',
                      'noopener,noreferrer'
                    );
                  }}
                />
              ) : null}

              <Card className="shadow-sm border-slate-200/60">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-5">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Historique des ordonnances
                  </CardTitle>
                  <CardDescription>
                    Renouveler une prescription passée ou rouvrir le PDF.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <PatientPrescriptionList
                    patientId={patient.id}
                    prescriptions={prescriptions}
                    patientDisplayName={patientDisplayName}
                    onRenew={handleRenewPrescription}
                  />
                </CardContent>
              </Card>

              <Card className="shadow-sm border-slate-200/60">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-5">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    Antécédents & Allergies
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 grid md:grid-cols-2 gap-6">
                  <PatientBioEditableField
                    patientId={patient.id}
                    field="allergies"
                    title="Allergies Connues"
                    value={patient.allergies}
                    variant="allergies"
                    onSaved={(next) =>
                      setPatient((prev: any) => (prev ? { ...prev, allergies: next } : prev))
                    }
                  />
                  <PatientBioEditableField
                    patientId={patient.id}
                    field="antecedents"
                    title="Antécédents Médicaux"
                    value={patient.antecedents}
                    variant="antecedents"
                    onSaved={(next) =>
                      setPatient((prev: any) => (prev ? { ...prev, antecedents: next } : prev))
                    }
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="evolution" className="m-0 mt-0 focus-visible:outline-none focus-visible:ring-0">
            <Card className="shadow-sm border-slate-200/60">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-5">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  Évolution des constantes
                </CardTitle>
                <CardDescription>
                  IMC = poids (kg) ÷ taille (m)² — courbes de poids et d’IMC à chaque mesure enregistrée
                  (visites).
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {evolutionChartData.length > 0 ? (
                  <div className="h-[min(360px,55vh)] w-full min-h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={evolutionChartData}
                        margin={{ top: 12, right: 12, left: 4, bottom: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                        <XAxis
                          dataKey="dateLabel"
                          tick={{ fontSize: 11 }}
                          tickMargin={8}
                        />
                        <YAxis
                          yAxisId="poids"
                          orientation="left"
                          tick={{ fontSize: 11 }}
                          domain={['auto', 'auto']}
                          width={44}
                          label={{
                            value: 'kg',
                            angle: -90,
                            position: 'insideLeft',
                            style: { fontSize: 11, fill: '#2563eb' },
                          }}
                        />
                        <YAxis
                          yAxisId="imc"
                          orientation="right"
                          tick={{ fontSize: 11 }}
                          domain={['auto', 'auto']}
                          width={40}
                          label={{
                            value: 'IMC',
                            angle: 90,
                            position: 'insideRight',
                            style: { fontSize: 11, fill: '#059669' },
                          }}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: 8,
                            border: '1px solid #e2e8f0',
                          }}
                          formatter={(value: number | string) =>
                            typeof value === 'number' ? value.toFixed(1) : String(value)
                          }
                        />
                        <Legend />
                        <Line
                          yAxisId="poids"
                          type="monotone"
                          dataKey="poidsKg"
                          name="Poids (kg)"
                          stroke="#2563eb"
                          strokeWidth={2}
                          dot={{ r: 4, fill: '#2563eb' }}
                          activeDot={{ r: 6 }}
                        />
                        <Line
                          yAxisId="imc"
                          type="monotone"
                          dataKey="imc"
                          name="IMC"
                          stroke="#059669"
                          strokeWidth={2}
                          dot={{ r: 4, fill: '#059669' }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-slate-500 text-sm">
                    Aucune mesure : renseignez taille et poids dans le dossier ou ajoutez une mesure
                    ci-dessous.
                  </div>
                )}

                <form
                  onSubmit={handleAddVitalMeasurement}
                  className="rounded-xl border border-slate-200 bg-white p-4 space-y-4"
                >
                  <p className="text-sm font-medium text-slate-800">
                    Nouvelle mesure (visite)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="vital-taille">Taille (cm)</Label>
                      <Input
                        id="vital-taille"
                        type="text"
                        inputMode="decimal"
                        value={vitalFormTaille}
                        onChange={(e) => setVitalFormTaille(e.target.value)}
                        placeholder="ex. 175"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vital-poids">Poids (kg)</Label>
                      <Input
                        id="vital-poids"
                        type="text"
                        inputMode="decimal"
                        value={vitalFormPoids}
                        onChange={(e) => setVitalFormPoids(e.target.value)}
                        placeholder="ex. 72.5"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vital-date">Date de la mesure</Label>
                      <Input
                        id="vital-date"
                        type="date"
                        value={vitalFormDate}
                        onChange={(e) => setVitalFormDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={vitalSaving}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {vitalSaving ? 'Enregistrement…' : 'Enregistrer la mesure'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="m-0 mt-0 focus-visible:outline-none focus-visible:ring-0">
            <div className="space-y-6">
              <Card className="shadow-sm border-slate-200/60">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-5">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Ordonnances
                  </CardTitle>
                  <CardDescription>
                    Historique des prescriptions — PDF aligné sur les réglages cabinet.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <PatientPrescriptionList
                    patientId={patient.id}
                    prescriptions={prescriptions}
                    patientDisplayName={patientDisplayName}
                    onRenew={handleRenewPrescription}
                  />
                  <Button
                    type="button"
                    className="w-full bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-md sm:w-auto"
                    onClick={() => {
                      setRenewPrescriptionPayload(null);
                      setIsPrescriptionModalOpen(true);
                    }}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Nouvelle ordonnance
                  </Button>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-slate-200/60">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileBadge className="w-5 h-5 text-blue-500" />
                      Générateur de Documents
                    </CardTitle>
                    <CardDescription>
                      Import de fichiers et autres documents pour ce patient.
                    </CardDescription>
                  </div>
                  <div className="space-y-3">
                    <input
                      ref={fileImportRef}
                      type="file"
                      className="sr-only"
                      accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
                      onChange={handleImportDocument}
                    />
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start">
                      <Button
                        type="button"
                        variant="outline"
                        className="border-blue-200 text-blue-700 hover:bg-blue-50"
                        onClick={() => fileImportRef.current?.click()}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Importer un document
                      </Button>
                      {patient?.id && (
                        <ImageUpload
                          patientId={patient.id}
                          className="sm:ml-0"
                          onUploaded={(doc) =>
                            setPatientUploadedDocs((prev) => [doc, ...prev])
                          }
                        />
                      )}
                    </div>
                    <p className="text-xs text-slate-400 max-w-[280px]">
                      PDF et images via « Importer » ; photos rapides (mobile / galerie) via les boutons ci-dessus.
                      Fichiers enregistrés côté serveur dans le dossier patient.
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-8">
                {patientUploadedDocs.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800 mb-3">
                      Documents du dossier
                    </h4>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {patientUploadedDocs.map((doc) => (
                        <div
                          key={doc.id}
                          className="p-3 border border-slate-100 rounded-xl bg-slate-50/80 hover:border-blue-200 transition-colors"
                        >
                          {doc.file_url ? (
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-sm font-medium text-blue-700 hover:underline break-words"
                            >
                              {doc.filename}
                            </a>
                          ) : (
                            <span className="text-sm font-medium text-slate-800">
                              {doc.filename}
                            </span>
                          )}
                          <p className="text-xs text-slate-500 mt-1">
                            {new Date(doc.createdAt).toLocaleString('fr-FR')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-semibold text-slate-800 mb-3">
                    Documents générés (PDF)
                  </h4>
                {documents.length === 0 ? (
                  <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    <p className="text-slate-500 font-medium">Aucun document n&apos;a été généré pour le moment.</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {documents.map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 border border-slate-100 shadow-sm rounded-xl bg-white hover:border-blue-200 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${doc.type === 'Facture' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                             {doc.type === 'Facture' ? <CreditCard className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 text-sm">{doc.type}</h4>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                              {doc.date}
                              {doc.montant && <span className="ml-1 text-emerald-600 font-bold">• {doc.montant}</span>}
                            </p>
                          </div>
                        </div>
                        <Button size="icon" variant="ghost" className="text-slate-400 hover:text-blue-600 hover:bg-blue-50">
                          <Download size={18} />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                </div>
              </CardContent>
            </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* --- MODALS (Shadcn Dialog) --- */}

      {patient?.id && (
        <PrescriptionForm
          patientId={patient.id}
          open={isPrescriptionModalOpen}
          onOpenChange={setIsPrescriptionModalOpen}
          defaultDiagnostic={latestDiagnostic}
          renewPayload={renewPrescriptionPayload}
          onRenewConsumed={() => setRenewPrescriptionPayload(null)}
          onSaved={() => {
            void fetchPrescriptions();
            setDocuments((d) => [
              ...d,
              { type: 'Ordonnance', date: new Date().toLocaleDateString('fr-FR') },
            ]);
          }}
        />
      )}

      <BillingModal
        open={isInvoiceModalOpen}
        onOpenChange={setIsInvoiceModalOpen}
        invoiceData={invoiceData}
        setInvoiceData={setInvoiceData}
        onSubmit={handleSaveInvoice}
      />

      {/* PDFs INVISIBLES POUR HTML2CANVAS */}
      <div className={styles.pdfTemplateWrapper} ref={invoiceRef}>
        <div className={styles.pdfHeader}>
          <div>
            <h1 className={styles.pdfLogo}>Nezha Medical</h1>
            <p>123 Avenue de la Santé, 75000 Paris</p>
            <p>Tél : 01 23 45 67 89</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h2 style={{fontSize: 24, margin: '0 0 10px 0'}}>FACTURE</h2>
            <p style={{fontSize: 14}}>N° FAC-{Date.now().toString().slice(-6)}</p>
            <p style={{fontSize: 14}}>Date : {new Date().toLocaleDateString('fr-FR')}</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', margin: '40px 0', fontSize: '16px' }}>
          <div>
            <p style={{margin: '0 0 5px 0', color: '#666'}}>Facturé à :</p>
            <p style={{margin: 0, fontWeight: 'bold'}}>{patient.prenom} {patient.nom}</p>
          </div>
          <div style={{textAlign: 'right'}}>
            <p style={{margin: '0 0 5px 0', color: '#666'}}>Paiement :</p>
            <p style={{margin: 0, fontWeight: 'bold'}}>{invoiceData.methode}</p>
          </div>
        </div>

        <table style={{width: '100%', borderCollapse: 'collapse', marginTop: '50px'}}>
             <thead>
               <tr style={{borderBottom: '2px solid #ccc', textAlign: 'left', background: '#f8fafc'}}>
                 <th style={{padding: '15px'}}>Désignation</th>
                 <th style={{padding: '15px', textAlign: 'right'}}>Montant</th>
               </tr>
             </thead>
             <tbody>
                <tr style={{borderBottom: '1px solid #eee'}}>
                    <td style={{padding: '20px 15px', fontSize: '16px'}}>Consultation Médicale ({new Date().toLocaleDateString('fr-FR')})</td>
                    <td style={{padding: '20px 15px', fontSize: '16px', textAlign: 'right'}}>{parseFloat(invoiceData.montant).toFixed(2)} {currencyAmountSuffix(invoiceData.currency?.trim() || cabinetMoneySettings?.currency?.trim() || 'EUR')}</td>
                </tr>
             </tbody>
        </table>

         <div style={{ marginTop: '50px', borderTop: '2px solid #3b82f6', paddingTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
             <div style={{width: '300px', marginLeft: 'auto'}}>
                 <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold'}}>
                     <span>TOTAL TTC</span>
                     <span>{parseFloat(invoiceData.montant).toFixed(2)} {currencyAmountSuffix(invoiceData.currency?.trim() || cabinetMoneySettings?.currency?.trim() || 'EUR')}</span>
                 </div>
                 <p style={{fontSize: '12px', color: '#666', textAlign: 'right', marginTop: '10px'}}>Montant réglé. TVA 0% (Prestation médicale)</p>
             </div>
         </div>
      </div>

    </div>
  );
}
