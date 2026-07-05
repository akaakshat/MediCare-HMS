const test = require('node:test');
const assert = require('node:assert/strict');
const { isSystemRelatedQuestion, buildSupportAssistantPrompt } = require('../services/supportAssistantService');

test('detects system-related requests', () => {
  assert.equal(isSystemRelatedQuestion('How do I book an appointment in the clinic system?'), true);
  assert.equal(isSystemRelatedQuestion('How do I reset my password for the hospital portal?'), true);
  assert.equal(isSystemRelatedQuestion('Can you tell me a joke?'), false);
  assert.equal(isSystemRelatedQuestion('What is the weather today?'), false);
});

test('builds a scope-restricted prompt for system support', () => {
  const prompt = buildSupportAssistantPrompt('How do I open the EMR?', {
    role: 'doctor',
    effectivePermissions: ['emr.view'],
    currentModule: 'emr',
  }, [
    { title: 'Open EMR', answer: 'Use the EMR module.', steps: ['Open EMR'] },
  ]);

  assert.match(prompt, /hospital system/i);
  assert.match(prompt, /system-related/i);
  assert.match(prompt, /EMR/i);
});
