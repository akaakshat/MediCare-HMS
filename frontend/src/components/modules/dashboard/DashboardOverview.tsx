import { useEffect, useState } from 'react';
import { Calendar, CreditCard, Package, RefreshCw, Users } from 'lucide-react';
import { ApiClient } from '../../../utils/api';
import { hasFeatureAccess } from '../../../utils/permissions';

interface DashboardOverviewProps {
  role: string;
  permissions: string[];
  features: string[];
  onOpenModule: (module: string) => void;
}

const todayKey = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

const displayValue = (value: unknown, fallback = 'Not recorded') =>
  value === undefined || value === null || value === '' ? fallback : String(value);

export function DashboardOverview({ role, permissions, features, onOpenModule }: DashboardOverviewProps) {
  const [data, setData] = useState({ patients: [], appointments: [], bills: [], items: [] } as any);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isAdmin = role === 'admin';
  const canSeeBilling = isAdmin || hasFeatureAccess(['billing.view'], permissions, features);
  const canSeePharmacy = isAdmin || hasFeatureAccess(['pharmacy.view'], permissions, features);

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    const date = todayKey();
    const start = new Date(`${date}T00:00:00`).toISOString();
    const end = new Date(`${date}T00:00:00`);
    end.setDate(end.getDate() + 1);

    try {
      const [patients, appointments, bills, pharmacy] = await Promise.all([
        ApiClient.getPatients({ createdFrom: start, createdTo: end.toISOString(), limit: 100 }),
        ApiClient.getAppointments({ date, limit: 100 }),
        canSeeBilling ? ApiClient.getBills({ date }) : Promise.resolve({ bills: [] }),
        canSeePharmacy ? ApiClient.getPharmacyItems() : Promise.resolve({ items: [] }),
      ]);
      setData({
        patients: patients?.patients || [],
        appointments: appointments?.appointments || [],
        bills: bills?.bills || [],
        items: pharmacy?.items || [],
      });
    } catch (loadError) {
      console.error('Failed to load dashboard overview:', loadError);
      setError('Some dashboard details could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [role]);

  const amount = (bill: any) => Number(bill?.amount ?? bill?.total ?? bill?.totalAmount ?? 0).toLocaleString();
  const patientName = (patient: any) => patient?.name || patient?.patientName || 'Unknown patient';

  const section = (title: string, icon: any, count: number, module: string, children: React.ReactNode) => {
    const Icon = icon;
    return (
      <section className="premium-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Icon className="h-4 w-4 shrink-0 text-blue-600" />
            <h2 className="truncate text-sm font-semibold text-slate-900">{title}</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{count}</span>
          </div>
          <button type="button" onClick={() => onOpenModule(module)} className="text-xs font-semibold text-blue-600 hover:text-blue-800">Open</button>
        </div>
        <div className="overflow-x-auto">{children}</div>
      </section>
    );
  };

  const empty = (message: string) => <p className="px-4 py-6 text-sm text-slate-500">{message}</p>;
  const tableClass = 'min-w-full text-left text-xs';
  const cellClass = 'whitespace-nowrap px-4 py-3 text-slate-700';

  if (loading) return <div className="premium-panel flex items-center gap-2 p-5 text-sm text-slate-500"><RefreshCw className="h-4 w-4 animate-spin" /> Loading today&apos;s activity...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">Today&apos;s activity</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">{isAdmin ? 'Clinic overview' : 'Your clinical overview'}</h2>
        </div>
        <button type="button" onClick={loadDashboard} title="Refresh dashboard" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
      </div>
      {error && <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</p>}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {section(isAdmin ? 'New patients today' : 'New patients assigned to you', Users, data.patients.length, 'patients', data.patients.length === 0 ? empty('No new patients today.') : (
          <table className={tableClass}><thead><tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><th className="px-4 py-2">Patient</th><th className="px-4 py-2">UHID</th><th className="px-4 py-2">Phone</th>{isAdmin && <th className="px-4 py-2">Status</th>}</tr></thead><tbody>{data.patients.map((patient: any) => <tr key={patient._id} className="border-t border-slate-100"><td className={cellClass}>{patientName(patient)}</td><td className={cellClass}>{displayValue(patient.uhid)}</td><td className={cellClass}>{displayValue(patient.phone)}</td>{isAdmin && <td className={cellClass}>{displayValue(patient.status)}</td>}</tr>)}</tbody></table>
        ))}
        {section('Appointments today', Calendar, data.appointments.length, 'appointments', data.appointments.length === 0 ? empty('No appointments scheduled for today.') : (
          <table className={tableClass}><thead><tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><th className="px-4 py-2">Patient</th><th className="px-4 py-2">Time</th><th className="px-4 py-2">Status</th>{isAdmin && <th className="px-4 py-2">Doctor</th>}</tr></thead><tbody>{data.appointments.map((appointment: any) => <tr key={appointment._id} className="border-t border-slate-100"><td className={cellClass}>{patientName(appointment.patient) || displayValue(appointment.patientName)}</td><td className={cellClass}>{new Date(appointment.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td><td className={cellClass}>{displayValue(appointment.status)}</td>{isAdmin && <td className={cellClass}>{displayValue(appointment.doctor)}</td>}</tr>)}</tbody></table>
        ))}
        {canSeeBilling && section('Billing activity', CreditCard, data.bills.length, 'billing', data.bills.length === 0 ? empty('No billing activity today.') : (
          <table className={tableClass}><thead><tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><th className="px-4 py-2">Patient</th><th className="px-4 py-2">Invoice</th><th className="px-4 py-2">Amount</th>{isAdmin && <th className="px-4 py-2">Status</th>}</tr></thead><tbody>{data.bills.map((bill: any) => <tr key={bill._id} className="border-t border-slate-100"><td className={cellClass}>{patientName(bill.patient) || displayValue(bill.patientName)}</td><td className={cellClass}>{displayValue(bill.invoiceId)}</td><td className={cellClass}>₹{amount(bill)}</td>{isAdmin && <td className={cellClass}>{displayValue(bill.status || bill.paymentStatus)}</td>}</tr>)}</tbody></table>
        ))}
        {canSeePharmacy && section('Pharmacy stock', Package, data.items.length, 'pharmacy', data.items.length === 0 ? empty('No pharmacy stock recorded.') : (
          <table className={tableClass}><thead><tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><th className="px-4 py-2">Item</th><th className="px-4 py-2">Stock</th><th className="px-4 py-2">Minimum</th>{isAdmin && <th className="px-4 py-2">Expiry</th>}</tr></thead><tbody>{data.items.map((item: any) => <tr key={item._id} className="border-t border-slate-100"><td className={cellClass}>{displayValue(item.name)}</td><td className={cellClass}>{displayValue(item.stock ?? item.quantity, '0')}</td><td className={cellClass}>{displayValue(item.minStock, '0')}</td>{isAdmin && <td className={cellClass}>{displayValue(item.expiry || item.expiryDate)}</td>}</tr>)}</tbody></table>
        ))}
      </div>
    </div>
  );
}
