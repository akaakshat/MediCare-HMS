import { useState, useEffect, useContext } from 'react';
import { Search, Trash2, ArrowLeft, BookOpen, Folder } from 'lucide-react';
import { ApiClient } from '../../../utils/api';
import { toast } from 'sonner';
import { AuthContext } from '../../../context/AuthContext';
import { Permissions } from '../../../config/permissions';
import { formatDateDDMMYYYY } from '../../../utils/date';

interface IcdCodeItem {
  _id: string;
  code: string;
  description: string;
  chapter?: string;
  category?: string;
  active: boolean;
}

interface IcdMapping {
  _id: string;
  patient: { _id: string; name: string; uhid?: string };
  doctor: { _id: string; name: string; specialization?: string };
  icdCode: IcdCodeItem;
  encounterDate: string;
  notes?: string;
  status?: string;
  isPrimary?: boolean;
}

export function IcdManagement({ onBack }: { onBack: () => void }) {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState<'master' | 'mapping'>('master');

  const [icdList, setIcdList] = useState<IcdCodeItem[]>([]);
  const [loadingIcd, setLoadingIcd] = useState(false);
  const [searchIcd, setSearchIcd] = useState('');

  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [mappingList, setMappingList] = useState<IcdMapping[]>([]);
  const [mappingLoading, setMappingLoading] = useState(false);
  const [mappingForm, setMappingForm] = useState({ icdCodeId: '', doctorId: user?._id || '', encounterDate: '', notes: '', status: 'active', isPrimary: false });

  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);

  useEffect(() => {
    loadIcd();
    loadPatients();
    loadDoctors();
  }, []);

  useEffect(() => {
    if (selectedPatientId) loadMapping(selectedPatientId);
  }, [selectedPatientId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadIcd();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchIcd]);

  const loadIcd = async () => {
    setLoadingIcd(true);
    try {
      const res = await ApiClient.getIcdCodes({ search: searchIcd, limit: 200 });
      setIcdList(res.icdCodes || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load ICD master list');
    } finally {
      setLoadingIcd(false);
    }
  };

  const loadPatients = async () => {
    try {
      const res = await ApiClient.getPatients({ limit: 200 });
      setPatients(res.patients || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadDoctors = async () => {
    try {
      const res = await ApiClient.getDoctors();
      setDoctors(res.doctors || []);
      if (res.doctors?.length && !mappingForm.doctorId) {
        setMappingForm((s) => ({ ...s, doctorId: res.doctors[0]._id }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadMapping = async (patientId: string) => {
    setMappingLoading(true);
    try {
      const res = await ApiClient.getPatientIcdHistory(patientId);
      setMappingList(res.mappings || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load patient ICD history');
    } finally {
      setMappingLoading(false);
    }
  };

  const removeIcd = async (id: string) => {
    if (!confirm('Inactivate this ICD code?')) return;
    try {
      await ApiClient.deleteIcdCode(id);
      toast.success('ICD code inactivated');
      loadIcd();
    } catch (err) {
      toast.error('Failed to inactivate ICD code');
    }
  };

  const submitMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !mappingForm.icdCodeId || !mappingForm.encounterDate) {
      toast.error('Select patient, ICD code and encounter date');
      return;
    }

    try {
      await ApiClient.createPatientIcdMapping(selectedPatientId, {
        doctorId: mappingForm.doctorId,
        icdCodeId: mappingForm.icdCodeId,
        encounterDate: mappingForm.encounterDate,
        notes: mappingForm.notes,
        status: mappingForm.status,
        isPrimary: mappingForm.isPrimary,
      });
      toast.success('Diagnosis added to patient history');
      loadMapping(selectedPatientId);
      setMappingForm((s) => ({ ...s, icdCodeId: '', notes: '', isPrimary: false }));
    } catch (err) {
      toast.error('Failed to add mapping');
    }
  };

  const deleteMapping = async (mapping: IcdMapping) => {
    if (!selectedPatientId) return;
    if (!confirm('Delete this patient diagnosis record?')) return;
    try {
      await ApiClient.deletePatientIcdMapping(selectedPatientId, mapping._id);
      toast.success('Deleted mapping');
      loadMapping(selectedPatientId);
    } catch (err) {
      toast.error('Failed to delete mapping');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} aria-label="Go back" title="Go back" className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><ArrowLeft className="w-5 h-5 text-gray-600"/></button>
          <div>
            <h2 className="text-gray-900">ICD Management</h2>
            <p className="text-sm text-gray-500">Manage ICD master list and patient diagnosis history</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('master')} className={`px-4 py-2 rounded-lg ${activeTab === 'master' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}><BookOpen className="w-4 h-4 inline"/> Master</button>
          <button onClick={() => setActiveTab('mapping')} className={`px-4 py-2 rounded-lg ${activeTab === 'mapping' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}><Folder className="w-4 h-4 inline"/> Patient History</button>
        </div>
      </div>

      {activeTab === 'master' && (
        <div className="bg-white shadow rounded-lg border p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">ICD Master List</h3>
              <p className="text-sm text-gray-500">ICD list is preloaded from the CSV file (section111_valid_icd10_october2025.csv). No manual ICD creation is allowed.</p>
            </div>
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-500" />
              <input value={searchIcd} onChange={(e) => setSearchIcd(e.target.value)} className="border rounded px-2 py-1" placeholder="Search code/description" />
            </div>
          </div>
            {loadingIcd ? (
              <p>Loading...</p>
            ) : (
              <div className="overflow-x-auto max-h-[420px]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="px-2 py-2 text-left">Code</th>
                      <th className="px-2 py-2 text-left">Description</th>
                      <th className="px-2 py-2 text-left">Chapter</th>
                      <th className="px-2 py-2 text-left">Cat</th>
                      <th className="px-2 py-2 text-left">Active</th>
                      <th className="px-2 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {icdList.map((item) => (
                      <tr key={item._id} className="border-b hover:bg-gray-50">
                        <td className="px-2 py-1">{item.code}</td>
                        <td className="px-2 py-1">{item.description}</td>
                        <td className="px-2 py-1">{item.chapter || '-'}</td>
                        <td className="px-2 py-1">{item.category || '-'}</td>
                        <td className="px-2 py-1">{item.active ? 'Yes' : 'No'}</td>
                        <td className="px-2 py-1 text-right space-x-1">
                          {Permissions.icdManage.includes(user?.role || '') && (
                            <button onClick={() => removeIcd(item._id)} aria-label="Inactivate ICD" title="Inactivate ICD" className="text-red-600"><Trash2 className="w-4 h-4"/></button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      )}

      {activeTab === 'mapping' && (
        <div className="grid grid-cols-1 gap-6">
          <div className="bg-white shadow rounded-lg border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Patient ICD History</h3>
              <div className="flex gap-2">
                <select aria-label="Patient" value={selectedPatientId} onChange={(e) => setSelectedPatientId(e.target.value)} className="border rounded px-2 py-1">
                  <option value="">Select patient</option>
                  {patients.map((p) => (<option key={p._id} value={p._id}>{p.name} ({p.uhid || p._id})</option>))}
                </select>
              </div>
            </div>

            {selectedPatientId ? (
              <div className="grid gap-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <select aria-label="ICD code" value={mappingForm.icdCodeId} onChange={(e) => setMappingForm((s) => ({ ...s, icdCodeId: e.target.value }))} className="border rounded px-2 py-1">
                    <option value="">Select ICD code</option>
                    {icdList.filter((e) => e.active).map((code) => (<option key={code._id} value={code._id}>{code.code} - {code.description}</option>))}
                  </select>
                  <select aria-label="Doctor" value={mappingForm.doctorId} onChange={(e) => setMappingForm((s) => ({ ...s, doctorId: e.target.value }))} className="border rounded px-2 py-1">
                    <option value="">Doctor</option>
                    {doctors.map((doc) => (
                      <option key={doc._id} value={doc._id}>{doc.name}{doc.specialization ? ` (${doc.specialization})` : ''}</option>
                    ))}
                    {user?.role === 'doctor' && !doctors.some((d) => d._id === user._id) && (
                      <option value={user._id}>{user.name}</option>
                    )}
                  </select>
                  <input type="date" aria-label="Encounter date" value={mappingForm.encounterDate} onChange={(e) => setMappingForm((s) => ({ ...s, encounterDate: e.target.value }))} className="border rounded px-2 py-1" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <input type="text" placeholder="Notes" value={mappingForm.notes} onChange={(e) => setMappingForm((s) => ({ ...s, notes: e.target.value }))} className="border rounded px-2 py-1 md:col-span-2" />
                  <select aria-label="Status" value={mappingForm.status} onChange={(e) => setMappingForm((s) => ({ ...s, status: e.target.value }))} className="border rounded px-2 py-1">
                    <option value="active">Active</option>
                    <option value="resolved">Resolved</option>
                    <option value="chronic">Chronic</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={mappingForm.isPrimary} onChange={(e) => setMappingForm((s) => ({ ...s, isPrimary: e.target.checked }))} id="mapping-primary" />
                  <label htmlFor="mapping-primary" className="text-gray-600 text-sm">Primary diagnosis</label>
                </div>
                <button onClick={submitMapping} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Add to Patient History</button>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="px-2 py-2">Encounter</th>
                        <th className="px-2 py-2">ICD</th>
                        <th className="px-2 py-2">Doctor</th>
                        <th className="px-2 py-2">Status</th>
                        <th className="px-2 py-2">Notes</th>
                        <th className="px-2 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mappingLoading ? (
                        <tr><td colSpan={6}>Loading ...</td></tr>
                      ) : mappingList.length === 0 ? (
                        <tr><td colSpan={6}>No diagnosis mapped for this patient.</td></tr>
                      ) : mappingList.map((item) => (
                        <tr key={item._id} className="border-b hover:bg-gray-50">
                          <td className="px-2 py-1">{formatDateDDMMYYYY(item.encounterDate)}</td>
                          <td className="px-2 py-1">{item.icdCode?.code} - {item.icdCode?.description}</td>
                          <td className="px-2 py-1">{item.doctor?.name || '-'}</td>
                          <td className="px-2 py-1">{item.status}</td>
                          <td className="px-2 py-1">{item.notes || '-'}</td>
                          <td className="px-2 py-1"><button onClick={() => deleteMapping(item)} className="text-red-600">Delete</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Choose patient to view or add ICD history.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
