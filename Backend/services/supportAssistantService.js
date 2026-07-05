const https = require('https');
const http = require('http');

const SYSTEM_SCOPE_TERMS = [
  'system', 'portal', 'module', 'access', 'permission', 'login', 'password',
  'appointment', 'patient', 'emr', 'billing', 'doctor', 'reception',
  'clinic', 'hospital', 'support', 'role', 'feature', 'dashboard', 'record',
  'user', 'account', 'permissions', 'module', 'appointment', 'schedule'
];

const BLOCKLIST_TERMS = [
  'weather', 'joke', 'stock', 'news', 'travel', 'movie', 'song', 'recipe',
  'politics', 'sports', 'game', 'dating', 'romance', 'personal', 'life advice',
  'medical advice', 'diagnosis', 'treatment', 'drug', 'medication'
];

const isSystemRelatedQuestion = (input = '') => {
  const normalized = String(input || '').toLowerCase();
  if (!normalized) return false;

  const containsBlockedTopic = BLOCKLIST_TERMS.some((term) => normalized.includes(term));
  if (containsBlockedTopic) return false;

  return SYSTEM_SCOPE_TERMS.some((term) => normalized.includes(term));
};

const buildSupportAssistantPrompt = (question, context = {}, articles = []) => {
  const role = context.role || 'user';
  const permissions = Array.isArray(context.effectivePermissions) ? context.effectivePermissions : [];
  const module = context.currentModule || 'dashboard';

  const articleContext = articles.length > 0
    ? articles.map((article) => `- Title: ${article.title}\n  Answer: ${article.answer}`).join('\n')
    : '- No article context available.';

  return [
    'You are an internal hospital support assistant for a HIS system.',
    'Answer only questions related to using this hospital system, permissions, modules, access, appointments, patients, EMR, billing, users, and support workflows.',
    'If the request is not about this system, politely decline and redirect to system-related help.',
    `User role: ${role}`,
    `Available permissions: ${permissions.join(', ') || 'none'}`,
    `Current module: ${module}`,
    'Use the provided article context when helpful, but do not invent unavailable features or data.',
    'Keep responses concise, practical, and action-oriented.',
    `User question: ${question}`,
    'Relevant support article context:',
    articleContext,
  ].join('\n');
};

const callExternalAi = async (prompt) => {
  const provider = (process.env.AI_PROVIDER || 'openai').toLowerCase();
  const apiKey = process.env.AI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return null;
  }

  if (provider === 'google' || provider === 'gemini') {
    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 400,
      },
    };

    return new Promise((resolve, reject) => {
      const body = JSON.stringify(payload);
      const req = https.request({
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models/${process.env.AI_MODEL || 'gemini-2.0-flash'}:generateContent?key=${apiKey}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            const text = parsed?.candidates?.[0]?.content?.parts?.map((part) => part.text).join('') || '';
            resolve(text);
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  if (provider === 'openai') {
    const payload = {
      model: process.env.AI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a scoped hospital system assistant.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
    };

    return new Promise((resolve, reject) => {
      const body = JSON.stringify(payload);
      const req = https.request({
        hostname: 'api.openai.com',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            const text = parsed?.choices?.[0]?.message?.content || '';
            resolve(text);
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  return null;
};

const getAiSupportReply = async (question, context = {}, articles = []) => {
  if (!isSystemRelatedQuestion(question)) {
    return {
      success: false,
      reason: 'not-system-related',
      message: 'I can help with hospital system tasks such as login, access, appointments, patient records, EMR, billing, and permissions.',
    };
  }

  const prompt = buildSupportAssistantPrompt(question, context, articles);
  try {
    const reply = await callExternalAi(prompt);
    if (!reply) {
      return {
        success: false,
        reason: 'ai-unavailable',
        message: 'AI assistance is not configured right now. Please use the built-in support guidance.',
      };
    }

    return {
      success: true,
      message: reply.trim(),
      source: 'ai',
    };
  } catch (error) {
    return {
      success: false,
      reason: 'ai-error',
      message: 'I could not reach the AI support service. Please try the built-in support steps instead.',
    };
  }
};

module.exports = {
  isSystemRelatedQuestion,
  buildSupportAssistantPrompt,
  getAiSupportReply,
};
