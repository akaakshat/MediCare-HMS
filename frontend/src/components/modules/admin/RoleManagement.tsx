import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Lock, Loader2, Search, AlertCircle } from 'lucide-react';
import { ApiClient } from '../../../utils/api';
import { toast } from 'sonner';

interface Role {
  _id: string;
  name: string;
  code: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  permissions?: string[];
}

interface Permission {
  key: string;
  label: string;
  group?: string;
}

export function RoleManagement() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [searching, setSearching] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedRoleForPermissions, setSelectedRoleForPermissions] = useState<Role | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    isActive: true
  });

  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  useEffect(() => {
    loadRoles();
    loadPermissions();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const response = await ApiClient.get<{ success: boolean; data: Role[] }>('/roles');
      if (response?.success && Array.isArray(response.data)) {
        setRoles(response.data);
      }
    } catch (error) {
      console.error('Failed to load roles:', error);
      toast.error('Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async () => {
    try {
      const response = await ApiClient.get<{ success: boolean; catalog: Permission[] }>('/rbac/permissions');
      if (response?.success && Array.isArray(response.catalog)) {
        setPermissions(response.catalog);
      }
    } catch (error) {
      console.error('Failed to load permissions:', error);
    }
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.code) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const payload = {
        ...formData,
        code: formData.code.toUpperCase(),
      };

      let response;
      if (editingId) {
        response = await ApiClient.put(`/roles/${editingId}`, payload);
      } else {
        response = await ApiClient.post('/roles', payload);
      }

      if (response?.success) {
        toast.success(editingId ? 'Role updated successfully!' : 'Role created successfully!');
        resetForm();
        await loadRoles();
      } else {
        toast.error(response?.message || 'Failed to save role');
      }
    } catch (error: any) {
      console.error('Error saving role:', error);
      toast.error(error.message || 'Failed to save role');
    }
  };

  const handleDeleteRole = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the role "${name}"?`)) {
      return;
    }

    try {
      const response = await ApiClient.delete(`/roles/${id}`);
      if (response?.success) {
        toast.success('Role deleted successfully!');
        await loadRoles();
      } else {
        toast.error(response?.message || 'Failed to delete role');
      }
    } catch (error: any) {
      console.error('Error deleting role:', error);
      toast.error(error.message || 'Failed to delete role');
    }
  };

  const handleEditRole = (role: Role) => {
    setFormData({
      name: role.name,
      code: role.code,
      description: role.description,
      isActive: role.isActive
    });
    setEditingId(role._id);
    setShowForm(true);
  };

  const handleCloneRole = async (role: Role) => {
    try {
      const response = await ApiClient.post('/roles', {
        name: `${role.name} Copy`,
        code: `${role.code}_COPY`,
        description: role.description || `Copy of ${role.name}`,
        isActive: role.isActive,
      });

      if (response?.success) {
        toast.success('Role cloned successfully!');
        await loadRoles();
      } else {
        toast.error(response?.message || 'Failed to clone role');
      }
    } catch (error: any) {
      console.error('Error cloning role:', error);
      toast.error(error.message || 'Failed to clone role');
    }
  };

  const handleManagePermissions = (role: Role) => {
    setSelectedRoleForPermissions(role);
    setSelectedPermissions(role.permissions || []);
    setShowPermissions(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedRoleForPermissions) return;

    try {
      const response = await ApiClient.put(`/roles/${selectedRoleForPermissions._id}/permissions`, {
        permissionIds: selectedPermissions
      });

      if (response?.success) {
        toast.success('Role permissions updated successfully!');
        setShowPermissions(false);
        await loadRoles();
      } else {
        toast.error(response?.message || 'Failed to update permissions');
      }
    } catch (error: any) {
      console.error('Error updating permissions:', error);
      toast.error(error.message || 'Failed to update permissions');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      isActive: true
    });
    setEditingId(null);
    setShowForm(false);
  };

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searching.toLowerCase()) ||
    role.code.toLowerCase().includes(searching.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Role Management</h2>
          <p className="text-gray-600 mt-1">Create, edit, and manage user roles with feature access control</p>
        </div>
        <button
          onClick={() => resetForm()}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Role
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search roles..."
          value={searching}
          onChange={(e) => setSearching(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Create/Edit Role Form */}
      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingId ? 'Edit Role' : 'Create New Role'}
          </h3>
          <form onSubmit={handleSaveRole} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Doctor, Nurse, Administrator"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role Code *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., DOCTOR, NURSE"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the purpose of this role..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingId ? 'Update Role' : 'Create Role'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Permissions Management */}
      {showPermissions && selectedRoleForPermissions && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Manage Permissions: {selectedRoleForPermissions.name}
          </h3>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                Select the features and permissions that {selectedRoleForPermissions.name}s will have access to in the system.
              </p>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {permissions.map((permission) => (
                <label key={permission.key} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedPermissions.includes(permission.key)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPermissions([...selectedPermissions, permission.key]);
                      } else {
                        setSelectedPermissions(selectedPermissions.filter((id) => id !== permission.key));
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{permission.label}</p>
                    <p className="text-sm text-gray-600">{permission.group || 'Access control'}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSavePermissions}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Save Permissions
              </button>
              <button
                onClick={() => setShowPermissions(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Roles Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {filteredRoles.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No roles found. Create your first role to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Role Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Code</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Description</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRoles.map((role) => (
                  <tr key={role._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{role.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm text-gray-700">{role.code}</code>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600">{role.description || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        role.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {role.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleManagePermissions(role)}
                          title="Manage Permissions"
                          className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                        >
                          <Lock className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditRole(role)}
                          title="Edit Role"
                          className="p-2 hover:bg-yellow-50 text-yellow-600 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleCloneRole(role)}
                          title="Clone Role"
                          className="p-2 hover:bg-purple-50 text-purple-600 rounded-lg transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRole(role._id, role.name)}
                          title="Delete Role"
                          className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <p className="text-sm text-blue-600 font-medium">Total Roles</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">{roles.length}</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <p className="text-sm text-green-600 font-medium">Active Roles</p>
          <p className="text-2xl font-bold text-green-900 mt-1">{roles.filter(r => r.isActive).length}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <p className="text-sm text-purple-600 font-medium">Total Permissions</p>
          <p className="text-2xl font-bold text-purple-900 mt-1">{permissions.length}</p>
        </div>
      </div>
    </div>
  );
}
