import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Search, Pill, AlertTriangle, TrendingUp, Package, Edit, Trash2, X } from 'lucide-react';
import { ApiClient } from '../../../utils/api';
import { toast } from 'sonner';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '../../../utils/date';

interface InventoryListProps {
  onBack: () => void;
}

interface Medicine {
  _id?: string;
  id: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  price: number;
  expiry: string;
  status?: string;
  sku?: string;
  createdAt?: string;
}

interface InventorySummary {
  totalItems: number;
  totalStock: number;
  totalValue: number;
  lowStock: number;
  criticalStock: number;
}

interface ExpiryAlert {
  _id: string;
  name: string;
  stock: number;
  expiryDate: string;
  status: string;
}

interface TopMover {
  medicineId: string;
  name: string;
  category: string;
  totalSold: number;
  currentStock: number;
}

interface SalesTrendPoint {
  _id: string;
  totalSold: number;
}

export function InventoryList({ onBack }: InventoryListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [formData, setFormData] = useState<Partial<Medicine>>({
    name: '',
    category: '',
    stock: 0,
    minStock: 0,
    price: 0,
    expiry: ''
  });
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [expiryAlerts, setExpiryAlerts] = useState<ExpiryAlert[]>([]);
  const [topMovers, setTopMovers] = useState<TopMover[]>([]);
  const [salesTrend, setSalesTrend] = useState<SalesTrendPoint[]>([]);
  const [saleData, setSaleData] = useState({ medicineId: '', quantity: 1, department: '' });

  useEffect(() => {
    fetchMedicines();
    fetchInventorySummary();
  }, []);

  const fetchMedicines = async () => {
    try {
      setLoading(true);
      const response = await ApiClient.get('/pharmacy');
      if (response.success) {
        const medicinesWithStatus = response.items.map((med: Medicine) => ({
          ...med,
          status: med.stock === 0 ? 'Out of Stock' :
                  med.stock < med.minStock ? 'Low Stock' : 'In Stock'
        }));
        setMedicines(medicinesWithStatus);
      }
    } catch (error: any) {
      console.error('Error fetching medicines:', error);
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const fetchInventorySummary = async () => {
    try {
      const response = await ApiClient.getInventorySummary();
      if (response.success) {
        setSummary(response.summary);
        setExpiryAlerts(response.expiryAlerts || []);
        setTopMovers(response.topMovers || []);
        setSalesTrend(response.salesTrend || []);
      }
    } catch (error: any) {
      console.error('Error fetching inventory summary:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingMedicine) {
        const itemId = (editingMedicine as any)._id || (editingMedicine as any).id;
        const response = await ApiClient.put(`/pharmacy/${itemId}`, formData);
        if (response.success) {
          toast.success('Medicine updated successfully');
          fetchMedicines();
          closeDialog();
        }
      } else {
        const response = await ApiClient.post('/pharmacy', formData);
        if (response.success) {
          toast.success('Medicine added successfully');
          fetchMedicines();
          closeDialog();
        }
      }
    } catch (error: any) {
      console.error('Error saving medicine:', error);
      toast.error(error.message || 'Failed to save medicine');
    }
  };

  const openDialog = (medicine?: Medicine) => {
    if (medicine) {
      const normalized = { ...medicine, id: (medicine as any)._id || medicine.id } as Medicine;
      setEditingMedicine(normalized);
      setFormData({
        name: medicine.name,
        category: (medicine as any).category,
        stock: (medicine as any).stock ?? (medicine as any).quantity ?? 0,
        minStock: (medicine as any).minStock ?? 0,
        price: (medicine as any).price ?? (medicine as any).unitPrice ?? 0,
        expiry: (medicine as any).expiry || (medicine as any).expiryDate || ''
      });
    } else {
      setEditingMedicine(null);
      setFormData({
        name: '',
        category: '',
        stock: 0,
        minStock: 0,
        price: 0,
        expiry: ''
      });
    }
    setShowDialog(true);
  };

  const handleRecordSale = async () => {
    try {
      if (!saleData.medicineId || saleData.quantity <= 0) {
        toast.error('Select a medicine and enter a positive quantity');
        return;
      }

      const response = await ApiClient.recordPharmacySale(saleData);
      if (response.success) {
        toast.success('Sale recorded and stock updated');
        fetchMedicines();
        fetchInventorySummary();
        setSaleData({ medicineId: '', quantity: 1, department: '' });
      }
    } catch (error: any) {
      console.error('Error recording sale:', error);
      toast.error(error.message || 'Failed to record sale');
    }
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditingMedicine(null);
    setFormData({
      name: '',
      category: '',
      stock: 0,
      minStock: 0,
      price: 0,
      expiry: ''
    });
  };

  const filteredMedicines = medicines.filter(medicine =>
    medicine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    medicine.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Stock':
        return 'bg-green-100 text-green-700';
      case 'Low Stock':
        return 'bg-yellow-100 text-yellow-700';
      case 'Out of Stock':
      case 'Critical':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const lowStockCount = medicines.filter(m => m.status === 'Low Stock').length;
  const outOfStockCount = medicines.filter(m => m.status === 'Out of Stock').length;
  const totalValue = medicines.reduce((sum, m) => sum + (m.stock * m.price), 0);

  const statsData = [
    { label: 'Total Items', value: medicines.length.toString(), icon: Package, color: 'text-blue-600' },
    { label: 'Low Stock', value: lowStockCount.toString(), icon: AlertTriangle, color: 'text-yellow-600' },
    { label: 'Out of Stock', value: outOfStockCount.toString(), icon: AlertTriangle, color: 'text-red-600' },
    { label: 'Total Value', value: `₹${(totalValue / 100000).toFixed(1)}L`, icon: TrendingUp, color: 'text-green-600' },
    { label: 'Expiry Alerts', value: expiryAlerts.length.toString(), icon: AlertTriangle, color: 'text-orange-600' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-pink-600 border-t-transparent rounded-full animate-spin"></div>
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
            <h2 className="text-gray-900">Pharmacy & Inventory</h2>
            <p className="text-sm text-gray-500">Manage medicine stock, sales, and reorder intelligence</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => openDialog()}
            className="bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Medicine
          </button>
          <button
            onClick={fetchInventorySummary}
            className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Refresh Summary
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsData.map((stat, index) => (
            <div key={index} className="bg-white rounded-lg shadow border border-gray-200 p-4">
              <div className="flex items-center gap-3 mb-2">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                <h4 className="text-gray-600">{stat.label}</h4>
              </div>
              <p className="text-gray-900">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <h4 className="text-gray-900 font-semibold mb-3">Expiry Risk</h4>
            {expiryAlerts.length === 0 ? (
              <p className="text-sm text-gray-500">No items expiring in the next 30 days.</p>
            ) : (
              <ul className="space-y-3">
                {expiryAlerts.slice(0, 5).map((item) => (
                  <li key={item._id} className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-800">{item.name}</p>
                      <p className="text-sm text-gray-500">Expiring {formatDateDDMMYYYY(item.expiryDate)}</p>
                    </div>
                    <span className="text-xs font-semibold text-orange-700 bg-orange-100 px-2 py-1 rounded-full">
                      {item.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <h4 className="text-gray-900 font-semibold mb-3">Top Movers (30d)</h4>
            {topMovers.length === 0 ? (
              <p className="text-sm text-gray-500">No sales data yet.</p>
            ) : (
              <ul className="space-y-3">
                {topMovers.slice(0, 4).map((item) => (
                  <li key={item.medicineId} className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-800">{item.name}</p>
                      <p className="text-sm text-gray-500">Sold {item.totalSold} units</p>
                    </div>
                    <span className="text-sm text-gray-600">Stock {item.currentStock}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="mb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-4 py-2 flex-1">
              <Search className="w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search medicines..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none outline-none text-sm flex-1"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:w-auto w-full">
              <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
                <p className="text-xs text-gray-500">Total Stock</p>
                <p className="text-lg font-semibold text-gray-900">{summary ? summary.totalStock : '-'}</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
                <p className="text-xs text-gray-500">Low Stock</p>
                <p className="text-lg font-semibold text-gray-900">{summary ? summary.lowStock : '-'}</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
                <p className="text-xs text-gray-500">Critical</p>
                <p className="text-lg font-semibold text-red-600">{summary ? summary.criticalStock : '-'}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_0.6fr]">
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
              <h4 className="text-gray-900 font-semibold mb-3">Inventory Sales Trend</h4>
              {salesTrend.length === 0 ? (
                <p className="text-sm text-gray-500">Sales trend data will appear after sales are recorded.</p>
              ) : (
                <div className="space-y-2">
                  {salesTrend.slice(-7).map((point) => (
                    <div key={point._id} className="flex items-center justify-between text-sm text-gray-700">
                      <span>{point._id}</span>
                      <span className="font-semibold">{point.totalSold}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
              <h4 className="text-gray-900 font-semibold mb-3">Record Sale</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Medicine</label>
                  <select
                    value={saleData.medicineId}
                    onChange={(e) => setSaleData({ ...saleData, medicineId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  >
                    <option value="">Select medicine</option>
                    {medicines.map((item) => (
                      <option key={item._id || item.id} value={item._id || item.id}>
                        {item.name} ({item.category || 'Uncategorized'})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={saleData.quantity}
                    onChange={(e) => setSaleData({ ...saleData, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={saleData.department}
                    onChange={(e) => setSaleData({ ...saleData, department: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleRecordSale}
                  className="w-full bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700 transition-colors"
                >
                  Record Sale
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

        {filteredMedicines.length === 0 ? (
          <div className="text-center py-12">
            <Pill className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No medicines found</p>
            <button 
              onClick={() => openDialog()}
              className="mt-4 text-pink-600 hover:text-pink-700"
            >
              Add your first medicine
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm text-gray-600">ID</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-600">Name</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-600">SKU</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-600">Category</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-600">Stock</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-600">Min Stock</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-600">Price (₹)</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-600">Expiry</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-600">Created</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMedicines.map((medicine) => {
                    const id = (medicine as any)._id || medicine.id;
                    const sku = (medicine as any).sku || '';
                    const stock = (medicine as any).stock ?? (medicine as any).quantity ?? 0;
                    const minStock = (medicine as any).minStock ?? 0;
                    const price = (medicine as any).price ?? (medicine as any).unitPrice ?? 0;
                    const expiry = (medicine as any).expiry || (medicine as any).expiryDate || '';
                    const created = (medicine as any).createdAt || (medicine as any).created || '';
                    const category = (medicine as any).category || '';
                    const status = medicine.status || (stock === 0 ? 'Out of Stock' : stock < minStock ? 'Low Stock' : 'In Stock');

                    return (
                    <tr key={id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-600">{id}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Pill className="w-4 h-4 text-pink-600" />
                          <span className="text-sm text-gray-900">{medicine.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{sku || '-'}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{category || '-'}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{stock}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{minStock}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">₹{price}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{expiry || '-'}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{created ? formatDateTimeDDMMYYYY(created) : '-'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs ${getStatusColor(status)}`}>
                          {status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => openDialog(medicine)}
                            className="p-1 hover:bg-pink-50 rounded text-pink-600"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (!confirm('Delete this medicine?')) return;
                              ApiClient.delete(`/pharmacy/${id}`).then(() => { toast.success('Deleted'); fetchMedicines(); }).catch((e) => { toast.error('Failed to delete'); console.error(e); });
                            }}
                            className="p-1 hover:bg-red-50 rounded text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
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
                {editingMedicine ? 'Edit Medicine' : 'Add New Medicine'}
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
                <label className="block text-sm text-gray-700 mb-1">Medicine Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder="e.g., Paracetamol 500mg"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Category *</label>
                <input
                  type="text"
                  required
                  value={formData.category || ''}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder="e.g., Antipyretic"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Stock Quantity *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.stock || 0}
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-1">Min Stock *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.minStock || 0}
                    onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Price (₹) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.price || 0}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Expiry Date *</label>
                <input
                  type="date"
                  required
                  value={formData.expiry || ''}
                  onChange={(e) => setFormData({ ...formData, expiry: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
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
                  className="flex-1 bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700 transition-colors"
                >
                  {editingMedicine ? 'Update' : 'Add'} Medicine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}