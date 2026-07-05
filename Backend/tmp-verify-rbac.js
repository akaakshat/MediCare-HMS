const { getEffectivePermissions, getEffectiveFeatures } = require('./services/rbacService');
const user = { role: 'staff', permissions: ['billing.view', 'patients.create', 'appointments.create', 'pharmacy.view'] };
console.log(JSON.stringify({ permissions: getEffectivePermissions(user), features: getEffectiveFeatures(user) }, null, 2));
