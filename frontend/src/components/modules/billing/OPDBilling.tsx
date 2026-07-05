import { useState, useEffect, useContext } from 'react';
import { ArrowLeft, Plus, Search, CreditCard, FileText, Download, Check, X, Edit } from 'lucide-react';
import jsPDF from 'jspdf/dist/jspdf.es.min.js';
import { ApiClient } from '../../../utils/api';
import { toast } from 'sonner';
import { AuthContext } from '../../../context/AuthContext';
import { Permissions } from '../../../config/permissions';
import { formatDateDDMMYYYY } from '../../../utils/date';

interface OPDBillingProps {
  onBack: () => void;
}

interface Bill {
  _id?: string;
  invoiceId?: string;
  id?: string;
  patient?: any;
  patientName?: string;
  uhid?: string;
  date?: string;
  amount?: number;
  status?: string;
  paymentMethod?: string;
  items?: Array<{ service: string; amount: number }>;
  doctor?: any;
  doctorName?: string;
}

export function OPDBilling({ onBack }: OPDBillingProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [invoices, setInvoices] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [formData, setFormData] = useState<Partial<Bill>>({
    patient: '',
    uhid: '',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    status: 'Pending',
    paymentMethod: '',
    doctor: ''
  });
  const [doctors, setDoctors] = useState<any[]>([]);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    fetchBills();
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const response: any = await ApiClient.get('/doctors');
      if (response.success) {
        setDoctors(response.doctors || []);
      }
    } catch (error: any) {
      console.error('Error fetching doctors:', error);
      toast.error('Failed to load doctors');
    }
  };

  const fetchBills = async () => {
    try {
      setLoading(true);
      const response = await ApiClient.get('/billing');
      if (response.success) {
        setInvoices(response.bills);
      }
    } catch (error: any) {
      console.error('Error fetching bills:', error);
      toast.error('Failed to load bills');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingBill) {
        // Prevent non-admins from editing paid invoices on client-side as well
        if ((editingBill.status === 'Paid' || (editingBill as any).paid) && user?.role !== 'admin') {
          toast.error('Paid invoices cannot be modified');
          return;
        }

        const payload = { ...formData };
        if (!payload.patientName && payload.patient) {
          payload.patientName = String(payload.patient);
        }

        const billId = (editingBill as any)._id || editingBill.id;
        const response = await ApiClient.put(`/billing/${billId}`, payload);
        if (response.success) {
          toast.success('Bill updated successfully');
          fetchBills();
          closeDialog();
        }
      } else {
        const payload = { ...formData };
        if (!payload.patientName && payload.patient) {
          payload.patientName = String(payload.patient);
        }

        const response = await ApiClient.post('/billing', payload);
        if (response.success) {
          toast.success('Invoice created successfully');
          fetchBills();
          closeDialog();
        }
      }
    } catch (error: any) {
      console.error('Error saving bill:', error);
      toast.error(error.message || 'Failed to save bill');
    }
  };

  const openDialog = (bill?: Bill) => {
    if (bill) {
      setEditingBill(bill);
      const doctorId = bill.doctor
        ? (typeof bill.doctor === 'object' ? bill.doctor._id || bill.doctor.id : bill.doctor)
        : '';
      setFormData({
        ...bill,
        doctor: doctorId
      });
    } else {
      setEditingBill(null);
      setFormData({
        patient: '',
        uhid: '',
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        status: 'Pending',
        paymentMethod: '',
        doctor: ''
      });
    }
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditingBill(null);
    setFormData({
      patient: '',
      uhid: '',
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      status: 'Pending',
      paymentMethod: ''
    });
  };

  // When UHID changes in billing dialog, fetch patient details and prefill name
  useEffect(() => {
    const uhid = formData.uhid?.trim();
    if (!uhid) return;

    const t = setTimeout(async () => {
      try {
        const resp: any = await ApiClient.getPatientByUHID(uhid);
        if (resp && resp.success && resp.patient) {
          setFormData((s) => ({ ...s, patient: typeof resp.patient === 'string' ? resp.patient : resp.patient?.name || s.patient }));
        }
      } catch (err) {
        // ignore
      }
    }, 400);

    return () => clearTimeout(t);
  }, [formData.uhid]);

  const isObjectIdString = (value?: string) => typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value);
  const extractObjectId = (value: string) => {
    if (!value) return undefined;
    // If value is like ObjectId("...") or new ObjectId("...")
    const maybeId = value.match(/([0-9a-fA-F]{24})/);
    if (maybeId) return maybeId[1];
    return undefined;
  };

  const toIdString = (value: unknown) => {
    if (!value) return undefined;
    if (typeof value === 'string') {
      if (isObjectIdString(value)) return value;
      return extractObjectId(value);
    }
    if (typeof value === 'object' && (value as any).toString) {
      const s = String((value as any).toString());
      if (isObjectIdString(s)) return s;
      return extractObjectId(s);
    }
    return undefined;
  };

  const getDisplayPatientName = (invoice: Bill) => {
    const rawName = (invoice as any).patientName;
    const rawNameIsId = typeof rawName === 'string' && isObjectIdString(rawName);
    if (rawName && !rawNameIsId) return rawName;

    const patient = invoice.patient;
    if (patient && typeof patient === 'object') {
      if (patient.name) return patient.name;
      if (patient._id) {
        const id = toIdString(patient._id);
        if (id) return id;
      }
      if (patient.id) {
        const id = toIdString(patient.id);
        if (id) return id;
      }
      const id = toIdString(patient);
      if (id) return id;
    }

    if (typeof invoice.patient === 'string') {
      return invoice.patient;
    }

    // Last resort: show whatever patientName contains (even if it's an ObjectId)
    if (typeof rawName === 'string') return rawName;

    return 'Unknown';
  };

  const filteredInvoices = invoices.filter(invoice => {
    const displayName = getDisplayPatientName(invoice) || '';
    const displayUhid = invoice.uhid || (invoice.patient && typeof invoice.patient === 'object' ? invoice.patient.uhid : '') || '';
    const idStr = (invoice.invoiceId || invoice.id || (invoice._id || '')).toString();
    const term = searchTerm.toLowerCase();
    return (
      displayName.toLowerCase().includes(term) ||
      idStr.toLowerCase().includes(term) ||
      displayUhid.toLowerCase().includes(term)
    );
  });

  const handleDelete = async (invoice: Bill) => {
    const idToDelete = (invoice as any)._id || invoice.id;
    if (!idToDelete) {
      toast.error('Unable to delete invoice (missing ID)');
      return;
    }

    const confirmed = window.confirm('Are you sure you want to delete this invoice?');
    if (!confirmed) return;

    try {
      const response = await ApiClient.delete(`/billing/${idToDelete}`);
      if (response.success) {
        toast.success('Invoice deleted');
        fetchBills();
      }
    } catch (err: any) {
      console.error('Error deleting invoice:', err);
      toast.error(err.message || 'Failed to delete invoice');
    }
  };

  const getStatusColor = (status: string = '') => {
    switch (status) {
      case 'Paid':
        return 'bg-green-100 text-green-700';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'Cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDate = (date?: string | Date, fallback?: string | Date) => {
    const value = date ?? fallback;
    if (!value) return '-';
    const formatted = formatDateDDMMYYYY(value);
    return formatted;
  };

  const handleDownload = (invoice: Bill) => {
    const invoiceId = invoice.invoiceId || invoice.id || (invoice as any)._id || 'bill';
    const patientName = getDisplayPatientName(invoice);
    const uhid = invoice.uhid || invoice.patient?.uhid || '-';
    const date = formatDate(invoice.date, (invoice as any).createdAt);
    const amount = invoice.amount || 0;

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    doc.setFontSize(18);
    doc.text('Invoice', 40, 50);

    doc.setFontSize(11);
    const lines = [
      `Invoice ID: ${invoiceId}`,
      `Patient Name: ${patientName}`,
      `UHID: ${uhid}`,
      `Date: ${date}`,
      `Amount: ₹${amount.toLocaleString()}`,
      `Payment Method: ${invoice.paymentMethod || '-'}`,
      `Status: ${invoice.status || '-'}`,
    ];

    lines.forEach((line, idx) => {
      doc.text(line, 40, 80 + idx * 18);
    });

    if (invoice.items && invoice.items.length) {
      doc.setFontSize(13);
      doc.text('Items:', 40, 80 + lines.length * 18 + 20);
      invoice.items.forEach((item, idx) => {
        const y = 80 + lines.length * 18 + 40 + idx * 16;
        doc.setFontSize(11);
        doc.text(`• ${item.service || item.name || 'Item'} - ₹${item.amount}`, 45, y);
      });
    }

    doc.save(`invoice-${invoiceId}.pdf`);
    toast.success('Invoice downloaded (PDF)');
  };

  const totalRevenue = invoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + (i.amount || 0), 0);
  const pendingAmount = invoices.filter(i => i.status === 'Pending').reduce((sum, i) => sum + (i.amount || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
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
            <h2 className="text-gray-900">Billing & Payments</h2>
            <p className="text-sm text-gray-500">Manage invoices and payments</p>
          </div>
        </div>
        {Permissions.billingCreate.includes(user?.role || '') && (
          <button 
            onClick={() => openDialog()}
            className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Consultation Billing
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-5 h-5 text-green-600" />
            <h4 className="text-gray-600">Total Revenue</h4>
          </div>
          <p className="text-gray-900">₹{totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h4 className="text-gray-600">Total Invoices</h4>
          </div>
          <p className="text-gray-900">{invoices.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Check className="w-5 h-5 text-green-600" />
            <h4 className="text-gray-600">Paid Invoices</h4>
          </div>
          <p className="text-gray-900">{invoices.filter(i => i.status === 'Paid').length}</p>
        </div>
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-5 h-5 text-yellow-600" />
            <h4 className="text-gray-600">Pending Amount</h4>
          </div>
          <p className="text-gray-900">₹{pendingAmount.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-4 py-2">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by invoice ID, patient name or UHID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-sm flex-1"
            />
          </div>
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No invoices found</p>
            <button 
              onClick={() => openDialog()}
              className="mt-4 text-yellow-600 hover:text-yellow-700"
            >
              Create your first invoice
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Invoice ID</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Patient Name</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">UHID</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Doctor</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Date</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Amount</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Payment Method</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => (
                      <tr key={(invoice as any).invoiceId || (invoice as any)._id || invoice.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-900">{(invoice as any).invoiceId || (invoice as any)._id || invoice.id}</td>
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {(!isObjectIdString(invoice.patientName) ? invoice.patientName : undefined) ||
                            (invoice.patient && typeof invoice.patient === 'object' ? invoice.patient.name : undefined) ||
                            (typeof invoice.patient === 'string' ? invoice.patient : undefined) ||
                            'Unknown'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {invoice.uhid || (invoice.patient && typeof invoice.patient === 'object' ? invoice.patient.uhid : '') || '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">
                          { (invoice.doctor && typeof invoice.doctor === 'object' ? invoice.doctor.name : (invoice.doctorName || (typeof invoice.doctor === 'string' ? invoice.doctor : '-'))) || '-' }
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {formatDate(invoice.date, (invoice as any).createdAt)}
                        </td>
                    <td className="py-3 px-4 text-sm text-gray-900">₹{(invoice.amount || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{invoice.paymentMethod || '-'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs ${getStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {(invoice.status !== 'Paid' || user?.role === 'admin') && (
                          <button 
                            onClick={() => openDialog(invoice)}
                            className="p-1 hover:bg-yellow-50 rounded text-yellow-600"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {user?.role === 'admin' && (
                          <button
                            onClick={() => handleDelete(invoice)}
                            className="p-1 hover:bg-red-50 rounded text-red-600"
                            title="Delete Invoice"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDownload(invoice)}
                          className="p-1 hover:bg-green-50 rounded text-green-600"
                          title="Download Invoice"
                        >
                          <Download className="w-4 h-4" />
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

      {/* Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-gray-900">
                {editingBill ? 'Edit Invoice' : 'Create New Invoice'}
              </h3>
              <button
                onClick={closeDialog}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Patient Name *</label>
                <input
                  type="text"
                  required
                  value={formData.patient || ''}
                  onChange={(e) => setFormData({ ...formData, patient: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">UHID *</label>
                <input
                  type="text"
                  required
                  value={formData.uhid || ''}
                  onChange={(e) => setFormData({ ...formData, uhid: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="UHID001234"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Doctor</label>
                <select
                  value={formData.doctor || ''}
                  onChange={(e) => setFormData({ ...formData, doctor: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                >
                  <option value="">Select a doctor</option>
                  {doctors.map((doc) => {
                    const id = (doc as any)._id || (doc as any).id;
                    const name = (doc as any).name || 'Unknown';
                    return (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={formData.date || ''}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.amount || 0}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Payment Method</label>
                <select
                  value={formData.paymentMethod || ''}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                >
                  <option value="">Select payment method</option>
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="Insurance">Insurance</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Status *</label>
                <select
                  required
                  value={formData.status || 'Pending'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                >
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
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
                  className="flex-1 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  {editingBill ? 'Update' : 'Create'} Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}