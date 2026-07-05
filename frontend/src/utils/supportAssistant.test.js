import test from 'node:test';
import assert from 'node:assert/strict';
import { getSupportResponse, getSuggestedQuestions } from './supportAssistant.js';

test('shows appointment help for users with appointment access', () => {
  const response = getSupportResponse('How do I book an appointment?', {
    role: 'receptionist',
    effectivePermissions: ['appointments.view'],
    currentModule: 'appointments',
  });

  assert.equal(response.id, 'book-appointment');
  assert.match(response.answer, /Appointments/);
});

test('hides billing help when billing access is missing', () => {
  const response = getSupportResponse('How do I manage billing?', {
    role: 'doctor',
    effectivePermissions: ['patients.view', 'appointments.view', 'emr.view'],
    currentModule: 'emr',
  });

  assert.equal(response.id, 'contact-support');
});

test('returns role-based suggestions for admins', () => {
  const suggestions = getSuggestedQuestions({
    role: 'admin',
    effectivePermissions: ['users.view', 'patients.view', 'appointments.view', 'emr.view', 'billing.view'],
  });

  assert.ok(suggestions.some((item) => item.id === 'admin-user-access'));
});

test('uses provided support articles when available', () => {
  const response = getSupportResponse('How do I manage billing?', {
    role: 'receptionist',
    effectivePermissions: ['billing.view'],
    currentModule: 'billing',
    articles: [{
      id: 'billing-help',
      title: 'How do I manage billing?',
      keywords: ['billing', 'payment'],
      roles: ['receptionist'],
      requiresFeatures: ['billing.view'],
      answer: 'Use the billing module.',
      steps: ['Open billing'],
      module: 'billing',
    }],
  });

  assert.equal(response.id, 'billing-help');
});
