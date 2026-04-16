/**
 * Champs additionnels renvoyés par GET /api/admin/analytics (aligné sur le JSON réel).
 */
export type PatientsByAssuranceRow = {
  assuranceType: string;
  label: string;
  count: number;
};

export type ConsultationsByMonthRow = {
  monthKey: string;
  label: string;
  count: number;
};

/** Patients ayant eu ≥1 consultation sur la période : nouveaux (1ère consultation dans la période) vs anciens (déjà suivis avant). */
export type PatientConsultationMix = {
  newPatientsActive: number;
  returningPatientsActive: number;
  /** Part des « nouveaux » parmi les patients actifs (consultation dans la période), 0–100. */
  ratioNewPercent: number;
};
