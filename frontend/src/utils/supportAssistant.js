const supportArticles = [
  {
    id: 'reset-password',
    title: 'Reset my password',
    keywords: ['password', 'login', 'sign in', 'signin', 'forgot'],
    roles: ['doctor', 'staff', 'receptionist', 'admin', 'nurse'],
    requiresFeatures: [],
    answer:
      'If you cannot sign in, first check that you are using the correct email and password. If you still cannot access the system, use the password reset option on the login page or ask your administrator to unlock your account.',
    steps: ['Verify your email address', 'Try the password reset flow', 'Contact the admin if the account is locked'],
    module: 'dashboard',
  },
  {
    id: 'book-appointment',
    title: 'How do I book an appointment?',
    keywords: ['appointment', 'schedule', 'book', 'reserve'],
    roles: ['doctor', 'staff', 'receptionist', 'admin', 'nurse'],
    requiresFeatures: ['appointments.view'],
    answer:
      'Open the Appointments module, select a patient, choose a date and time, and save the booking. Receptionists and staff can usually create appointments from the appointment list screen.',
    steps: ['Open the Appointments module', 'Select or create the patient', 'Choose the date and time', 'Save the appointment'],
    module: 'appointments',
  },
  {
    id: 'view-patient-records',
    title: 'How do I view patient records?',
    keywords: ['patient record', 'patient records', 'patient info', 'patient details'],
    roles: ['doctor', 'staff', 'receptionist', 'admin', 'nurse'],
    requiresFeatures: ['patients.view'],
    answer:
      'Use the Patient Management module to search for the patient and open the record. If you cannot see the patient, your account may be missing patient viewing access.',
    steps: ['Open Patient Management', 'Search for the patient', 'Open the patient profile'],
    module: 'patients',
  },
  {
    id: 'emr-access',
    title: 'How do I open the EMR or case sheet?',
    keywords: ['emr', 'case sheet', 'medical record', 'history'],
    roles: ['doctor', 'staff', 'receptionist', 'admin', 'nurse'],
    requiresFeatures: ['emr.view'],
    answer:
      'Open the EMR module from the dashboard and select the patient to view or update the case sheet. Doctors and staff with EMR access can add notes and review patient history here.',
    steps: ['Open EMR / Case Sheets', 'Select the patient', 'Review or update the case sheet'],
    module: 'emr',
  },
  {
    id: 'billing-help',
    title: 'How do I manage billing?',
    keywords: ['billing', 'payment', 'invoice', 'charge'],
    roles: ['staff', 'receptionist', 'admin'],
    requiresFeatures: ['billing.view'],
    answer:
      'Use the Billing & Payments module to review invoices, charges, and payments for the selected patient. If you do not see billing options, request billing access from the administrator.',
    steps: ['Open Billing & Payments', 'Select the patient', 'Review or create the bill'],
    module: 'billing',
  },
  {
    id: 'role-access',
    title: 'Why can I not see a module?',
    keywords: ['module', 'access denied', 'permission', 'feature'],
    roles: ['doctor', 'staff', 'receptionist', 'admin', 'nurse'],
    requiresFeatures: [],
    answer:
      'If a module is missing from your dashboard, your role or assigned feature permissions may not include that area. Contact the administrator to confirm the required access for your role.',
    steps: ['Check the dashboard modules', 'Confirm your assigned role', 'Request the missing access'],
    module: 'dashboard',
  },
  {
    id: 'admin-user-access',
    title: 'How do I manage users and permissions?',
    keywords: ['user', 'users', 'permission', 'permissions', 'role'],
    roles: ['admin'],
    requiresFeatures: ['users.view'],
    answer:
      'Admins can manage user accounts, roles, and permissions from the User Management area. Review the role assignments before granting access to sensitive modules.',
    steps: ['Open User Management', 'Select the user', 'Review or update permissions'],
    module: 'clinic-users',
  },
];

const normalizeText = (value) => String(value || '').trim().toLowerCase();

export const getSupportResponse = (query, context = {}) => {
  const normalizedQuery = normalizeText(query);
  const role = normalizeText(context.role);
  const effectivePermissions = Array.isArray(context.effectivePermissions)
    ? context.effectivePermissions.map((item) => normalizeText(item))
    : [];
  const currentModule = normalizeText(context.currentModule);
  const articleCatalog = Array.isArray(context.articles) && context.articles.length > 0
    ? context.articles
    : supportArticles;

  const matchingArticles = articleCatalog.filter((article) => {
    const title = normalizeText(article.title);
    const keywords = article.keywords.map(normalizeText);
    const titleMatches = !!normalizedQuery && (title.includes(normalizedQuery) || normalizedQuery.includes(title));
    const keywordMatches = keywords.some((keyword) => normalizedQuery.includes(keyword));
    return titleMatches || keywordMatches || !normalizedQuery;
  });

  const visibleArticles = matchingArticles.filter((article) => {
    const roleAllowed = article.roles.includes(role) || article.roles.includes('all');
    const hasRequiredFeatures = article.requiresFeatures.every((feature) => effectivePermissions.includes(normalizeText(feature)));
    return roleAllowed && hasRequiredFeatures;
  });

  const roleOrFeatureRestrictedArticles = matchingArticles.filter((article) => {
    const roleAllowed = article.roles.includes(role) || article.roles.includes('all');
    const hasRequiredFeatures = article.requiresFeatures.every((feature) => effectivePermissions.includes(normalizeText(feature)));
    return !roleAllowed || !hasRequiredFeatures;
  });

  if (!visibleArticles.length) {
    if (matchingArticles.length > 0 && roleOrFeatureRestrictedArticles.length > 0) {
      return {
        id: 'contact-support',
        title: 'Need more help?',
        answer: 'Your account does not currently have access to the specific module or feature referenced by your question. Please contact the IT support team or your administrator to review your permissions.',
        steps: ['Contact the IT support team', 'Ask for the required feature access', 'Confirm your role assignment'],
        module: currentModule || 'dashboard',
      };
    }

    return {
      id: 'role-access',
      title: 'Why can I not see a module?',
      answer: 'If a module is missing from your dashboard, your role or assigned feature permissions may not include that area. Contact the administrator to confirm the required access for your role.',
      steps: ['Check the dashboard modules', 'Confirm your assigned role', 'Request the missing access'],
      module: currentModule || 'dashboard',
    };
  }

  const scored = visibleArticles
    .map((article) => {
      const title = normalizeText(article.title);
      const keywords = article.keywords.map(normalizeText);
      const moduleScore = currentModule && normalizeText(article.module) === currentModule ? 8 : 0;
      const titleScore = title.includes(normalizedQuery) || normalizedQuery.includes(title) ? 10 : 0;
      const keywordScore = keywords.reduce((score, keyword) => score + (normalizedQuery.includes(keyword) ? 5 : 0), 0);
      const fallbackScore = !normalizedQuery ? 4 : 0;
      return { article, score: moduleScore + titleScore + keywordScore + fallbackScore };
    })
    .sort((left, right) => right.score - left.score);

  const bestMatch = scored[0];

  if (!bestMatch || bestMatch.score <= 0) {
    const fallbackArticle = visibleArticles.find((article) => article.module === currentModule) || visibleArticles[0];
    return {
      ...fallbackArticle,
      answer: fallbackArticle.answer,
      steps: fallbackArticle.steps,
    };
  }

  return {
    ...bestMatch.article,
    answer: bestMatch.article.answer,
    steps: bestMatch.article.steps,
  };
};

export const getSuggestedQuestions = (context = {}) => {
  const role = normalizeText(context.role);
  const effectivePermissions = Array.isArray(context.effectivePermissions)
    ? context.effectivePermissions.map((item) => normalizeText(item))
    : [];
  const articleCatalog = Array.isArray(context.articles) && context.articles.length > 0
    ? context.articles
    : supportArticles;

  return articleCatalog
    .filter((article) => {
      const roleAllowed = article.roles.includes(role) || article.roles.includes('all');
      const hasRequiredFeatures = article.requiresFeatures.every((feature) => effectivePermissions.includes(normalizeText(feature)));
      return roleAllowed && hasRequiredFeatures;
    })
    .slice(0, 8)
    .map((article) => ({ id: article.id, title: article.title }));
};
