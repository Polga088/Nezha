import 'dotenv/config';

import test from 'node:test';
import assert from 'node:assert/strict';

import { insuranceCodeToPatientAssuranceType } from '../src/lib/patient-insurance-resolve';

test('keeps explicit AUTRE only when the selected insurance code is AUTRE', () => {
  assert.equal(insuranceCodeToPatientAssuranceType('AUTRE'), 'AUTRE');
});

test('does not collapse dynamic insurance codes to AUTRE', () => {
  assert.equal(insuranceCodeToPatientAssuranceType('WAFA_ASSURANCE'), 'AUCUNE');
  assert.equal(insuranceCodeToPatientAssuranceType(' mutuelle_speciale '), 'AUCUNE');
});

test('preserves legacy enum insurance codes for compatibility', () => {
  assert.equal(insuranceCodeToPatientAssuranceType('CNSS'), 'CNSS');
  assert.equal(insuranceCodeToPatientAssuranceType('cnops'), 'CNOPS');
});
