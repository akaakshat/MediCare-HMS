import { useState, useEffect, useContext, useRef } from 'react';
import { ArrowLeft, FileText, User, Calendar, Activity, Pill, TestTube, X, Plus, Search, Trash2 } from 'lucide-react';
import { ApiClient } from '../../../utils/api';
import { toast } from 'sonner';
import { AuthContext } from '../../../context/AuthContext';
import { Permissions } from '../../../config/permissions';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '../../../utils/date';

interface OPCaseSheetProps {
  onBack: () => void;
}

interface EMRRecord {
  _id?: string;
  id: string;
  uhid: string;
  patient: string;
  date: string;
  doctor: string;
  complaint: string;
  hopi: string;
  physicalExamination: string;
  diagnosis: string;
  prescription: string;
  tests: string;
}

export function OPCaseSheet({ onBack }: OPCaseSheetProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState('');
  const [caseSheets, setCaseSheets] = useState<EMRRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState<Partial<EMRRecord>>({
    uhid: '',
    patient: '',
    date: new Date().toISOString().split('T')[0],
    doctor: '',
    complaint: '',
    hopi: '',
    physicalExamination: '',
    diagnosis: '',
    prescription: '',
    tests: ''
  });
  const [doctors, setDoctors] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [medicineInput, setMedicineInput] = useState('');
  const [medicineSuggestions, setMedicineSuggestions] = useState<string[]>([]);
  const [allMedicines, setAllMedicines] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [medicineDetails, setMedicineDetails] = useState({ frequency: '', route: '', duration: '', dose: '' });
  const [diagnosisQuery, setDiagnosisQuery] = useState('');
  const [diagnosisSuggestions, setDiagnosisSuggestions] = useState<any[]>([]);
  const [showDiagnosisSuggestions, setShowDiagnosisSuggestions] = useState(false);
  const medicineInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    fetchEMRRecords();
    fetchDoctors();
  }, [page, limit, debouncedSearch]);
  const { user } = useContext(AuthContext);

  const fetchEMRRecords = async () => {
    try {
      setLoading(true);
      const response = await ApiClient.getEMRRecords({ page, limit, search: debouncedSearch });
      if (response.success) {
        setCaseSheets(response.records);
        setTotal(response.pagination?.total || 0);
        setTotalPages(response.pagination?.totalPages || 1);
        if (response.records.length > 0 && !selectedPatient) {
          setSelectedPatient(response.records[0].uhid);
        }
      }
    } catch (error: any) {
      console.error('Error fetching EMR records:', error);
      toast.error('Failed to load EMR records');
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const resp: any = await ApiClient.getDoctors();
      setDoctors(resp.doctors || []);
    } catch (err) {
      console.error('Failed to fetch doctors', err);
    }
  };

  const fetchMedicines = async () => {
    try {
      const resp: any = await ApiClient.get('/mdm/medicine_master', { activeOnly: true });
      const items = resp.data || resp.items || [];
      const medicineNames = items
        .map((item: any) => item.name || item.label || item.value || item.medicineName)
        .filter((name: string | undefined): name is string => Boolean(name && String(name).trim()));

      const pharmacyResp: any = await ApiClient.getPharmacyItems();
      const pharmacyItems = pharmacyResp.items || [];
      const pharmacyMedicineNames = pharmacyItems
        .map((item: any) => item.name || item.medicineName)
        .filter((name: string | undefined): name is string => Boolean(name && String(name).trim()));

      const combined = [...new Set([...medicineNames, ...pharmacyMedicineNames])];
      setAllMedicines(combined);
    } catch (err) {
      console.error('Failed to fetch medicines', err);
      try {
        const resp: any = await ApiClient.getPharmacyItems();
        const items = resp.items || [];
        const medicineNames = items.map((item: any) => item.name || item.medicineName).filter(Boolean);
        setAllMedicines(medicineNames);
      } catch (fallbackErr) {
        console.error('Failed to fetch medicines from fallback source', fallbackErr);
      }
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, []);

  useEffect(() => {
    const uhid = formData.uhid?.trim();
    if (!uhid) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const resp: any = await ApiClient.get('/billing', { uhid });
        if (resp.success && Array.isArray(resp.bills) && resp.bills.length > 0) {
          const latest = resp.bills[0];
          const resolvedDoctor =
            latest.doctorName || (latest.doctor && (latest.doctor.name || latest.doctor.doctorName || '')) || '';
          if (resolvedDoctor) {
            setFormData((current) => ({ ...current, doctor: resolvedDoctor }));
          }
        }
      } catch (err) {
        console.error('Failed to fetch billed doctor for UHID', uhid, err);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [formData.uhid]);

  // Handle medicine autocomplete
  useEffect(() => {
    if (medicineInput.trim().length === 0) {
      setMedicineSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const input = medicineInput.toLowerCase();
    const filtered = allMedicines
      .filter((med) => med.toLowerCase().includes(input) && !medicines.includes(med))
      .sort((a, b) => a.localeCompare(b))
      .slice(0, 8);

    setMedicineSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
  }, [medicineInput, allMedicines, medicines]);

  const generatePrintableHtml = (sheet: EMRRecord) => {
    const style = `
      body { font-family: Arial, Helvetica, sans-serif; padding: 20px; color: #111827 }
      h1 { font-size: 20px; margin-bottom: 8px }
      p { margin: 4px 0 }
      .section { border: 1px solid #e5e7eb; padding: 12px; margin-bottom: 12px; border-radius: 6px }
    `;

    return `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Case Sheet - ${sheet.patient}</title>
          <style>${style}</style>
        </head>
        <body>
          <h1>Case Sheet</h1>
          <p><strong>Patient:</strong> ${sheet.patient}</p>
          <p><strong>UHID:</strong> ${sheet.uhid}</p>
          <p><strong>Date:</strong> ${sheet.date}</p>
          <p><strong>Doctor:</strong> ${sheet.doctor}</p>

          <div class="section">
            <h2>Chief Complaint</h2>
            <p>${sheet.complaint || '-'}</p>
          </div>

          ${sheet.hopi ? `<div class="section">
            <h2>HOPI (History of Present Illness)</h2>
            <p>${sheet.hopi.replace(/\n/g, '<br>')}</p>
          </div>` : ''}

          ${sheet.physicalExamination ? `<div class="section">
            <h2>Physical Examination</h2>
            <p>${sheet.physicalExamination.replace(/\n/g, '<br>')}</p>
          </div>` : ''}

          <div class="section">
            <h2>Diagnosis</h2>
            <p>${sheet.diagnosis || '-'}</p>
          </div>

          <div class="section">
            <h2>Prescription</h2>
            <p>${sheet.prescription || '-'}</p>
          </div>

          <div class="section">
            <h2>Investigations / Tests</h2>
            <p>${sheet.tests || '-'}</p>
          </div>

          <script>
            window.onload = function() { window.focus(); }
          <\/script>
        </body>
      </html>`;
  };

  const openPrintWindow = (html: string) => {
    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) {
      toast.error('Unable to open print window (popups blocked)');
      return null;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    return w;
  };

  const handlePrint = (sheet: EMRRecord) => {
    const html = generatePrintableHtml(sheet);
    const w = openPrintWindow(html);
    if (!w) return;
    // Give the browser a short moment to render then call print
    setTimeout(() => {
      try {
        w.print();
      } catch (e) {
        console.error('Print failed', e);
        toast.error('Print failed');
      }
    }, 300);
  };

  const handleDownload = (sheet: EMRRecord) => {
    // We reuse the print flow — user can choose "Save as PDF" in the print dialog
    handlePrint(sheet);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (medicines.length === 0) {
      toast.error('Please add at least one medicine to the prescription');
      return;
    }
    
    // Convert medicines array to prescription format (JSON string for structured data)
    const prescriptionData = medicines.map((med: any) => {
      const parts: string[] = [med.name];
      if (med.dose?.trim()) parts.push(`Dose: ${med.dose}`);
      if (med.frequency?.trim()) parts.push(`Frequency: ${med.frequency}`);
      if (med.route?.trim()) parts.push(`Route: ${med.route}`);
      if (med.duration?.trim()) parts.push(`Duration: ${med.duration}`);
      return parts.join(' | ');
    }).join('\n');
    
    try {
      const response = await ApiClient.post('/emr', { ...formData, prescription: prescriptionData, medicineDetails: medicines });
      if (response.success) {
        toast.success('Case sheet created successfully');
        fetchEMRRecords();
        closeDialog();
        setSelectedPatient(response.record.uhid);
      }
    } catch (error: any) {
      console.error('Error creating case sheet:', error);
      toast.error(error.message || 'Failed to create case sheet');
    }
  };

  const openDialog = () => {
    setFormData({
      uhid: '',
      patient: '',
      date: new Date().toISOString().split('T')[0],
      doctor: user?.role === 'doctor' ? user?.name || '' : '',
      complaint: '',
      hopi: '',
      physicalExamination: '',
      diagnosis: '',
      prescription: '',
      tests: ''
    });
    setMedicines([]);
    setMedicineInput('');
    setMedicineSuggestions([]);
    setMedicineDetails({ frequency: '', route: '', duration: '', dose: '' });
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setFormData({
      uhid: '',
      patient: '',
      date: new Date().toISOString().split('T')[0],
      doctor: '',
      complaint: '',
      hopi: '',
      physicalExamination: '',
      diagnosis: '',
      prescription: '',
      tests: ''
    });
    setMedicines([]);
    setMedicineInput('');
    setMedicineSuggestions([]);
    setMedicineDetails({ frequency: '', route: '', duration: '', dose: '' });
  };

  const addMedicine = (medicineName: string) => {
    const name = medicineName.trim();
    if (name && !medicines.some((m: any) => m.name === name)) {
      setMedicines([
        ...medicines,
        {
          name,
          frequency: medicineDetails.frequency,
          route: medicineDetails.route,
          duration: medicineDetails.duration,
          dose: medicineDetails.dose
        }
      ]);
      setMedicineInput('');
      setMedicineSuggestions([]);
      setShowSuggestions(false);
      setMedicineDetails({ frequency: '', route: '', duration: '', dose: '' });
    }
  };

  const removeMedicine = (index: number) => {
    setMedicines(medicines.filter((_: any, i: number) => i !== index));
  };

  const handleMedicineInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addMedicine(medicineInput);
    }
  };

  // When UHID changes in the dialog, fetch patient details and prefill fields
  useEffect(() => {
    const uhid = formData.uhid?.trim();
    if (!uhid) return;

    const t = setTimeout(async () => {
      try {
        const resp: any = await ApiClient.getPatientByUHID(uhid);
        if (resp && resp.success && resp.patient) {
          setFormData((s) => ({
            ...s,
            patient: typeof resp.patient === 'string' ? resp.patient : resp.patient?.name || s.patient,
            // keep uhid as-is; if patient record contains phone/other fields, you can map them here
          }));
        }
      } catch (err) {
        // ignore not found
      }
    }, 400);

    return () => clearTimeout(t);
  }, [formData.uhid]);

  useEffect(() => {
    if (!diagnosisQuery.trim()) {
      setDiagnosisSuggestions([]);
      setShowDiagnosisSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const resp: any = await ApiClient.getIcdCodes({ search: diagnosisQuery, limit: 8 });
        setDiagnosisSuggestions(resp.icdCodes || []);
        setShowDiagnosisSuggestions(true);
      } catch (err) {
        console.error('Failed to load ICD diagnosis suggestions:', err);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [diagnosisQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h2 className="text-gray-900">Electronic Medical Records</h2>
            <p className="text-sm text-gray-500">View and manage patient case sheets</p>
            <div className="mt-4">
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-4 py-2">
                <Search className="w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search case sheets (patient/doctor/uhid)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm flex-1"
                />
              </div>
            </div>
          </div>
        </div>
        {/* Check emrCreate permission to create case sheets */}
        {Permissions.emrCreate.includes(user?.role || '') && (
          <button 
            onClick={openDialog}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Case Sheet
          </button>
        )}
      </div>

      {caseSheets.length === 0 ? (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          {Permissions.emrCreate.includes(user?.role || '') ? (
            <>
              <p className="text-gray-500 mb-4">No case sheets found</p>
              <button 
                onClick={openDialog}
                className="text-orange-600 hover:text-orange-700"
              >
                Create your first case sheet
              </button>
            </>
          ) : (
            <>
              <p className="text-gray-500 mb-4">No patients in your consultation billing.</p>
              <p className="text-gray-400">Only patients billed by your consultation are visible here.</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <h3 className="text-gray-900 mb-4">Recent Case Sheets</h3>
            <div className="space-y-2">
              {caseSheets.map((sheet) => (
                <button
                  key={sheet._id || sheet.id}
                  onClick={() => setSelectedPatient(sheet.uhid)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedPatient === sheet.uhid
                      ? 'bg-orange-50 border border-orange-200'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <p className="text-sm text-gray-900 mb-1">{sheet.patient}</p>
                  <p className="text-xs text-gray-500">{sheet.uhid} • {sheet.date}</p>
                </button>
              ))}
            </div>

            {caseSheets.length > 0 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-500">
                  Showing {caseSheets.length} of {total} case sheets
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1 border rounded-lg text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-3 py-1 border rounded-lg text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                  >
                    Next
                  </button>
                  <select
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className="text-sm border rounded-lg px-2 py-1"
                  >
                    {[10, 20, 50, 100].map((l) => (
                      <option key={l} value={l}>
                        {l} per page
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 bg-white rounded-lg shadow border border-gray-200 p-6">
            {caseSheets.filter(s => s.uhid === selectedPatient).map((sheet) => (
              <div key={sheet._id || sheet.id} className="space-y-6">
                <div className="flex items-start gap-4 pb-6 border-b border-gray-200">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-gray-900 mb-2">{sheet.patient}</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">UHID</p>
                        <p className="text-gray-900">{sheet.uhid}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Date</p>
                        <p className="text-gray-900">{formatDateDDMMYYYY(sheet.date)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Doctor</p>
                        <p className="text-gray-900">{sheet.doctor}</p>
                      </div>
                    </div>
                    {sheet.history?.length ? (
                      <p className="text-xs text-gray-500 mt-3">
                        Last updated by {sheet.history[sheet.history.length - 1]?.byName || 'Unknown'} on {formatDateTimeDDMMYYYY(sheet.history[sheet.history.length - 1]?.at)}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-5 h-5 text-orange-600" />
                      <h4 className="text-gray-900">Chief Complaint</h4>
                    </div>
                    <p className="text-gray-600">{sheet.complaint}</p>
                  </div>

                  {sheet.hopi && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-5 h-5 text-orange-600" />
                        <h4 className="text-gray-900">HOPI (History of Present Illness)</h4>
                      </div>
                      <p className="text-gray-600 whitespace-pre-wrap">{sheet.hopi}</p>
                    </div>
                  )}

                  {sheet.physicalExamination && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-5 h-5 text-orange-600" />
                        <h4 className="text-gray-900">Physical Examination</h4>
                      </div>
                      <p className="text-gray-600 whitespace-pre-wrap">{sheet.physicalExamination}</p>
                    </div>
                  )}

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-5 h-5 text-orange-600" />
                      <h4 className="text-gray-900">Diagnosis</h4>
                    </div>
                    <p className="text-gray-600">{sheet.diagnosis}</p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Pill className="w-5 h-5 text-orange-600" />
                      <h4 className="text-gray-900">Prescription</h4>
                    </div>
                    <p className="text-gray-600">{sheet.prescription}</p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TestTube className="w-5 h-5 text-orange-600" />
                      <h4 className="text-gray-900">Investigations</h4>
                    </div>
                    <p className="text-gray-600">{sheet.tests}</p>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => handlePrint(sheet)}
                    className={`px-4 py-2 border border-gray-300 rounded-lg transition-colors ${user?.role === 'doctor' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                    disabled={user?.role === 'doctor'}
                  >
                    Print
                  </button>
                  <button
                    onClick={() => handleDownload(sheet)}
                    className={`px-4 py-2 border border-gray-300 rounded-lg transition-colors ${user?.role === 'doctor' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                    disabled={user?.role === 'doctor'}
                  >
                    Download PDF
                  </button>

                  {['admin', 'nurse'].includes(user?.role || '') && (
                    <button
                      onClick={async () => {
                        const confirm = window.confirm('Delete this case sheet? This action cannot be undone.');
                        if (!confirm) return;

                        const id = String(sheet._id ?? sheet.id ?? '');
                        if (!id) {
                          toast.error('Cannot delete: missing case sheet ID');
                          return;
                        }

                        try {
                          console.debug('Deleting case sheet id:', id);
                          await ApiClient.deleteEMRRecord(id);
                          toast.success('Case sheet deleted');
                          fetchEMRRecords();
                          setSelectedPatient((prev) => (prev === sheet.uhid ? '' : prev));
                        } catch (err: any) {
                          console.error('Error deleting case sheet:', err);
                          toast.error(err?.message || 'Failed to delete case sheet');
                        }
                      }}
                      className="px-4 py-2 border border-red-300 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-gray-900">New Case Sheet</h3>
              <button
                onClick={closeDialog}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">UHID *</label>
                  <input
                    type="text"
                    required
                    value={formData.uhid || ''}
                    onChange={(e) => setFormData({ ...formData, uhid: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="UHID001234"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-1">Patient Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.patient || ''}
                    onChange={(e) => setFormData({ ...formData, patient: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.date || ''}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-1">Doctor *</label>
                <input
                  type="text"
                  required
                  readOnly
                  value={formData.doctor || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-slate-100 text-gray-700 cursor-not-allowed"
                  placeholder="Doctor will be auto-filled from latest billed consultation"
                />
                <p className="text-xs text-gray-500 mt-1">Doctor populated from latest billing/consultation record by UHID; field is not editable.</p>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Chief Complaint *</label>
                <textarea
                  required
                  rows={3}
                  value={formData.complaint || ''}
                  onChange={(e) => setFormData({ ...formData, complaint: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Describe the patient's main symptoms..."
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">HOPI (History of Present Illness)</label>
                <textarea
                  rows={4}
                  maxLength={5000}
                  value={formData.hopi || ''}
                  onChange={(e) => setFormData({ ...formData, hopi: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Enter detailed history of present illness..."
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Physical Examination</label>
                <textarea
                  rows={4}
                  maxLength={5000}
                  value={formData.physicalExamination || ''}
                  onChange={(e) => setFormData({ ...formData, physicalExamination: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Enter physical examination findings..."
                />
              </div>

              <div className="relative">
                <label className="block text-sm text-gray-700 mb-1">Diagnosis *</label>
                <input
                  required
                  type="text"
                  value={diagnosisQuery}
                  onChange={(e) => {
                    setDiagnosisQuery(e.target.value);
                    setFormData({ ...formData, diagnosis: e.target.value });
                    setShowDiagnosisSuggestions(true);
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowDiagnosisSuggestions(false), 150);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Start typing diagnosis to get ICD suggestions..."
                />

                {showDiagnosisSuggestions && diagnosisSuggestions.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-lg border border-gray-300 bg-white shadow-lg">
                    {diagnosisSuggestions.map((item: any, index: number) => (
                      <button
                        key={`${item._id || item.code}-${index}`}
                        type="button"
                        className="block w-full text-left px-3 py-2 hover:bg-slate-100"
                        onClick={() => {
                          const text = `${item.code || ''} - ${item.description || ''}`.trim();
                          setFormData({ ...formData, diagnosis: text });
                          setDiagnosisQuery(text);
                          setShowDiagnosisSuggestions(false);
                        }}
                      >
                        <span className="font-semibold">{item.code}</span>
                        <span className="ml-2 text-sm text-gray-700">{item.description}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Prescription *</label>
                <div className="space-y-3">
                  {/* Medicine input with autocomplete */}
                  <div className="relative">
                    <input
                      ref={medicineInputRef}
                      type="text"
                      value={medicineInput}
                      onChange={(e) => setMedicineInput(e.target.value)}
                      onKeyDown={handleMedicineInputKeyDown}
                      onFocus={() => medicineInput.trim() && setShowSuggestions(true)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Type medicine name to see recommendations..."
                    />
                    {/* Autocomplete suggestions dropdown */}
                    {showSuggestions && medicineSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-orange-300 rounded-xl mt-2 shadow-xl z-20 max-h-64 overflow-auto">
                        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-orange-600 bg-orange-50 border-b border-orange-100">
                          Suggested medicines
                        </div>
                        {medicineSuggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => addMedicine(suggestion)}
                            className="w-full text-left px-3 py-2.5 hover:bg-orange-50 transition-colors text-sm text-gray-800 border-b border-gray-100 last:border-b-0"
                          >
                            <span className="font-medium">{suggestion}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Optional prescription details fields */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-xs text-gray-600 font-semibold mb-3">Optional Prescription Details:</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Dose</label>
                        <input
                          type="text"
                          placeholder="e.g., 500mg, 1 tablet"
                          value={medicineDetails.dose}
                          onChange={(e) => setMedicineDetails({ ...medicineDetails, dose: e.target.value })}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Frequency</label>
                        <input
                          type="text"
                          placeholder="e.g., once daily, twice daily"
                          value={medicineDetails.frequency}
                          onChange={(e) => setMedicineDetails({ ...medicineDetails, frequency: e.target.value })}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Route</label>
                        <input
                          type="text"
                          placeholder="e.g., oral, IV, topical"
                          value={medicineDetails.route}
                          onChange={(e) => setMedicineDetails({ ...medicineDetails, route: e.target.value })}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Duration</label>
                        <input
                          type="text"
                          placeholder="e.g., 5 days, 1 week"
                          value={medicineDetails.duration}
                          onChange={(e) => setMedicineDetails({ ...medicineDetails, duration: e.target.value })}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Add button */}
                  <button
                    type="button"
                    onClick={() => addMedicine(medicineInput)}
                    disabled={!medicineInput.trim()}
                    className="w-full bg-orange-600 text-white px-3 py-2 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    Add Medicine
                  </button>

                  {/* List of added medicines */}
                  {medicines.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <p className="text-xs text-gray-600 mb-2 font-semibold">Added Medicines:</p>
                      <div className="space-y-2">
                        {medicines.map((medicine: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-start justify-between bg-white p-2 rounded border border-gray-200 text-sm"
                          >
                            <div className="flex-1">
                              <p className="text-gray-900 font-medium">{medicine.name}</p>
                              {(medicine.dose || medicine.frequency || medicine.route || medicine.duration) && (
                                <p className="text-xs text-gray-600 mt-1">
                                  {[
                                    medicine.dose && `Dose: ${medicine.dose}`,
                                    medicine.frequency && `Freq: ${medicine.frequency}`,
                                    medicine.route && `Route: ${medicine.route}`,
                                    medicine.duration && `Duration: ${medicine.duration}`
                                  ].filter(Boolean).join(' | ')}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeMedicine(idx)}
                              className="ml-2 p-1 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {medicines.length === 0 && (
                    <p className="text-sm text-gray-500 italic">No medicines added yet</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Investigations/Tests *</label>
                <textarea
                  required
                  rows={2}
                  value={formData.tests || ''}
                  onChange={(e) => setFormData({ ...formData, tests: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="List tests ordered..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={medicines.length === 0}
                  className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={medicines.length === 0 ? 'Add at least one medicine' : ''}
                >
                  Create Case Sheet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}