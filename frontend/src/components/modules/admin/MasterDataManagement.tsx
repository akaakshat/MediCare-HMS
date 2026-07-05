import { useState, useEffect } from 'react';
import { 
  Plus, Edit2, Trash2, Eye, EyeOff, Loader2, Search, 
  Key, AlertTriangle 
} from 'lucide-react';
import { ApiClient } from '../../../utils/api';
import { toast } from 'sonner';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  createdAt: string;
}

interface FeatureAccess {
  _id: string;
  features: string[];
  grantedAt: string;
  expiresAt?: string;
}

interface AccessGrant {
  targetId: string;
  targetType: 'user' | 'role';
  features: string[];
  expiresAt?: string;
}

const AVAILABLE_FEATURES = [
  'view_patients',
  'create_patients',
  'edit_patients',
  'delete_patients',
  'view_appointments',
  'create_appointments',
  'edit_appointments',
  'cancel_appointments',
  'view_emr',
  'create_emr',
  'edit_emr',
  'delete_emr',
  'view_billing',
  'create_billing',
  'edit_billing',
  'approve_billing',
  'view_pharmacy',
  'manage_pharmacy',
  'view_reports',
  'export_reports',
  'manage_users',
  'manage_roles',
  'manage_permissions',
  'view_audit_logs'
];

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrator', color: 'bg-red-100 text-red-800' },
  { value: 'doctor', label: 'Doctor', color: 'bg-purple-100 text-purple-800' },
  { value: 'nurse', label: 'Nurse', color: 'bg-pink-100 text-pink-800' },
  { value: 'receptionist', label: 'Receptionist', color: 'bg-green-100 text-green-800' },
  { value: 'staff', label: 'Staff', color: 'bg-blue-100 text-blue-800' }
];

export function MasterDataManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Access Management State
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [selectedUserForAccess, setSelectedUserForAccess] = useState<User | null>(null);
  const [userFeatures, setUserFeatures] = useState<FeatureAccess[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [accessLoading, setAccessLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    role: 'staff'
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await ApiClient.get('/users');
      if (response?.success && Array.isArray(response.users)) {
        setUsers(response.users);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      setCreating(true);
      
      if (editingId) {
        // Update existing user
        const response = await ApiClient.put(`/users/${editingId}`, {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role
        });

        if (response?.success) {
          toast.success('User updated successfully!');
          setEditingId(null);
          await loadUsers();
        } else {
          toast.error(response?.message || 'Failed to update user');
        }
      } else {
        // Create new user
        const response = await ApiClient.registerUser(
          formData.email,
          formData.password,
          formData.name,
          formData.role,
          formData.phone
        );

        if (response?.success) {
          toast.success(`${formData.role.charAt(0).toUpperCase() + formData.role.slice(1)} account created successfully!`);
          setFormData({ name: '', email: '', password: '', confirmPassword: '', phone: '', role: 'staff' });
          setShowForm(false);
          await loadUsers();
        } else {
          toast.error(response?.message || 'Failed to create user');
        }
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to process request');
    } finally {
      setCreating(false);
    }
  };

  const handleEditUser = (user: User) => {
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      confirmPassword: '',
      phone: user.phone || '',
      role: user.role
    });
    setEditingId(user._id);
    setShowForm(true);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await ApiClient.delete(`/users/${userId}`);
      if (response?.success) {
        toast.success('User deleted successfully');
        await loadUsers();
      } else {
        toast.error(response?.message || 'Failed to delete user');
      }
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Failed to delete user');
    }
  };

  const handleOpenAccessModal = async (user: User) => {
    setSelectedUserForAccess(user);
    setShowAccessModal(true);
    setSelectedFeatures([]);
    
    try {
      setAccessLoading(true);
      const response = await ApiClient.getUserFeatures(user._id);
      if (response?.success && Array.isArray(response.data)) {
        setUserFeatures(response.data);
        // Combine all features from all access grants
        const allFeatures = response.data.flatMap(f => f.features || []);
        setSelectedFeatures(allFeatures);
      }
    } catch (error) {
      console.error('Failed to load user features:', error);
      toast.error('Failed to load user features');
    } finally {
      setAccessLoading(false);
    }
  };

  const handleGrantFeatures = async () => {
    if (!selectedUserForAccess || selectedFeatures.length === 0) {
      toast.error('Please select at least one feature');
      return;
    }

    try {
      setAccessLoading(true);
      const response = await ApiClient.grantFeatureAccess(
        selectedUserForAccess._id,
        'user',
        selectedFeatures
      );

      if (response?.success) {
        toast.success('Features granted successfully');
        setShowAccessModal(false);
        setSelectedUserForAccess(null);
        setSelectedFeatures([]);
        await loadUsers();
      } else {
        toast.error(response?.message || 'Failed to grant features');
      }
    } catch (error: any) {
      console.error('Error granting features:', error);
      toast.error(error.message || 'Failed to grant features');
    } finally {
      setAccessLoading(false);
    }
  };

  const handleRevokeFeatures = async (accessId: string) => {
    if (!window.confirm('Revoke these features? User will lose access immediately.')) {
      return;
    }

    try {
      const response = await ApiClient.revokeFeatureAccess(accessId);
      if (response?.success) {
        toast.success('Features revoked successfully');
        if (selectedUserForAccess) {
          await handleOpenAccessModal(selectedUserForAccess);
        }
      } else {
        toast.error(response?.message || 'Failed to revoke features');
      }
    } catch (error: any) {
      console.error('Error revoking features:', error);
      toast.error(error.message || 'Failed to revoke features');
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searching.toLowerCase()) ||
    user.email.toLowerCase().includes(searching.toLowerCase())
  );

  const getRoleColor = (role: string) => {
    return ROLE_OPTIONS.find(r => r.value === role)?.color || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Master Data Management</h1>
          <p className="text-gray-600 mt-1">Manage users, roles, and access permissions</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({
              name: '',
              email: '',
              password: '',
              confirmPassword: '',
              phone: '',
              role: 'staff'
            });
            setShowForm(!showForm);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={20} />
          Create New User
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 border border-blue-200">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? 'Edit User' : 'Create New User'}
          </h2>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Full Name *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="col-span-2 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <input
                type="email"
                placeholder="Email *"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!!editingId}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />

              {!editingId && (
                <>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password *"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-gray-500"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <input
                    type="password"
                    placeholder="Confirm Password *"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </>
              )}

              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {ROLE_OPTIONS.map(role => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:bg-gray-400"
              >
                {creating ? <Loader2 size={18} className="animate-spin" /> : null}
                {editingId ? 'Update User' : 'Create User'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searching}
            onChange={(e) => setSearching(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="animate-spin text-blue-600" size={40} />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Phone</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Role</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Created</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{user.name}</td>
                    <td className="px-6 py-4 text-gray-600">{user.email}</td>
                    <td className="px-6 py-4 text-gray-600">{user.phone || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getRoleColor(user.role)}`}>
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleOpenAccessModal(user)}
                          className="p-2 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition"
                          title="Manage Feature Access"
                        >
                          <Key size={18} />
                        </button>
                        <button
                          onClick={() => handleEditUser(user)}
                          className="p-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                          title="Edit User"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user._id)}
                          className="p-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                          title="Delete User"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Access Management Modal */}
      {showAccessModal && selectedUserForAccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                Manage Feature Access
              </h2>
              <button
                onClick={() => setShowAccessModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <p className="text-gray-600 mb-4">
              User: <strong>{selectedUserForAccess.name}</strong> ({selectedUserForAccess.email})
            </p>

            {accessLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="animate-spin text-blue-600" size={32} />
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Available Features:</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {AVAILABLE_FEATURES.map(feature => (
                      <label key={feature} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedFeatures.includes(feature)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedFeatures([...selectedFeatures, feature]);
                            } else {
                              setSelectedFeatures(selectedFeatures.filter(f => f !== feature));
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">{feature.replace(/_/g, ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {userFeatures.length > 0 && (
                  <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <h3 className="font-semibold text-purple-900 mb-3">Current Grants:</h3>
                    <div className="space-y-2">
                      {userFeatures.map((grant, index) => (
                        <div key={index} className="flex justify-between items-start bg-white p-3 rounded border">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900">
                              {grant.features.join(', ')}
                            </p>
                            <p className="text-xs text-gray-600">
                              Granted: {new Date(grant.grantedAt).toLocaleDateString()}
                              {grant.expiresAt && ` | Expires: ${new Date(grant.expiresAt).toLocaleDateString()}`}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRevokeFeatures(grant._id)}
                            className="p-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition ml-2"
                            title="Remove access"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleGrantFeatures}
                    disabled={accessLoading || selectedFeatures.length === 0}
                    className="flex-1 flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition disabled:bg-gray-400"
                  >
                    <Key size={18} />
                    Assign Features to User
                  </button>
                  <button
                    onClick={() => setShowAccessModal(false)}
                    className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
