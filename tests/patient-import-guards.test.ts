import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PATIENT_IMPORT_MAX_FILE_BYTES,
  resolvePatientIdentityDecision,
  validatePatientImportFileSize,
} from '../src/lib/patient-import';

test('rejects identity conflicts when CIN and email point to different patients', () => {
  const patientA = { id: 'patient-a', cin: 'AA123', email: 'a@example.com' };
  const patientB = { id: 'patient-b', cin: 'BB456', email: 'b@example.com' };

  const decision = resolvePatientIdentityDecision({
    id: null,
    cin: patientA,
    email: patientB,
  });

  assert.equal(decision.selected, null);
  assert.ok(decision.conflict);
  assert.equal(
    decision.conflict?.message,
    "Conflit d’identité : le CIN correspond à un patient différent de celui correspondant à l’email."
  );
});

test('rejects files larger than 10 Mo with HTTP 413 semantics', () => {
  const fileTooLarge = validatePatientImportFileSize(PATIENT_IMPORT_MAX_FILE_BYTES + 1);

  assert.ok(fileTooLarge);
  assert.equal(fileTooLarge?.status, 413);
  assert.equal(
    fileTooLarge?.message,
    'Fichier trop volumineux — taille maximale autorisée : 10 Mo.'
  );
});

test('accepts files at the 10 Mo boundary', () => {
  const boundary = validatePatientImportFileSize(PATIENT_IMPORT_MAX_FILE_BYTES);
  assert.equal(boundary, null);
});
