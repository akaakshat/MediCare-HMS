import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Download, TrendingUp, Users, Calendar, CreditCard } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { ApiClient } from '../../../utils/api';

interface MISReportsProps {
  onBack: () => void;
}

interface Patient {
  _id?: string;
  name: string;
  email: string;
  uhid: string;
}

interface Appointment {
  _id?: string;
  id: string;
  patient: string;
  date: string;
  doctor?: any;
}

interface Bill {
  _id?: string;
  amount: number;
  patient: any;
}

interface Doctor {
  _id?: string;
  id: string;
  name: string;
  email: string;
  role: string;
}

export function MISReports({ onBack }: MISReportsProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const reportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchData();
    // refresh reports periodically so the reports view stays live
    const id = setInterval(fetchData, 5000);
    return () => clearInterval(id);
  }, []);

  const firstLoad = useRef(true);

  const fetchData = async () => {
    try {
      // show the loading spinner only for the initial load
      if (firstLoad.current) setLoading(true);
      const [patientsRes, appointmentsRes, billsRes, doctorsRes] = await Promise.all([
        ApiClient.getPatients(),
        ApiClient.getAppointments(),
        ApiClient.getBills(),
        ApiClient.getDoctors(),
      ]);
      
      setPatients(patientsRes.patients || []);
      setAppointments(appointmentsRes.appointments || []);
      setBills(billsRes.bills || []);
      setDoctors(doctorsRes.doctors || []);
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      // hide initial loading only after first fetch; keep subsequent refresh silent
      if (firstLoad.current) {
        setLoading(false);
        firstLoad.current = false;
      }
    }
  };

  // Calculate stats from real data
  const totalPatients = patients.length;
  const totalAppointments = appointments.length;
  const totalRevenue = bills.reduce((sum, bill) => sum + (bill.amount || 0), 0);
  const avgBillValue = bills.length > 0 ? totalRevenue / bills.length : 0;

  // Generate monthly data from real appointments and bills grouped by month
  const monthlyData = generateMonthlyData(appointments, bills, patients);
  
  // Calculate appointment distribution based on actual appointment types
  // (Only these four types are shown in the chart.)
  const appointmentCategories = ['Consultation', 'Follow-up', 'Check-up', 'Emergency'];

  const normalizeApptType = (type: string | undefined) => {
    const normalized = (type || 'Consultation').toString().trim().toLowerCase();
    const canonical: Record<string, string> = {
      consultation: 'Consultation',
      'follow-up': 'Follow-up',
      'follow up': 'Follow-up',
      'check-up': 'Check-up',
      'check up': 'Check-up',
      emergency: 'Emergency',
      emergeny: 'Emergency',
      emerency: 'Emergency',
      emergncy: 'Emergency',
    };
    return canonical[normalized] ?? 'Other';
  };

  const appointmentTypeCounts = appointments.reduce<Record<string, number>>((acc, appt) => {
    const type = normalizeApptType(appt.type);
    acc[type] = (acc[type] ?? 0) + 1;
    return acc;
  }, {});

  const departmentData = appointmentCategories
    .map((dept) => ({ name: dept, value: appointmentTypeCounts[dept] ?? 0 }))
    .filter((entry) => entry.value > 0);

  const otherTypes = Object.keys(appointmentTypeCounts).filter((type) => !appointmentCategories.includes(type));
  if (otherTypes.length > 0) {
    const otherValue = otherTypes.reduce((sum, type) => sum + (appointmentTypeCounts[type] ?? 0), 0);
    if (otherValue > 0) departmentData.push({ name: 'Other', value: otherValue });
  }

  const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#14B8A6', '#F97316', '#0EA5E9', '#A855F7'];

  const RADIAN = Math.PI / 180;
  // Customized label placed outside the slice; skip very small slices to avoid overlap
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
    if (percent < 0.05) return null; // hide labels smaller than 5%
    const radius = innerRadius + (outerRadius - innerRadius) * 1.2;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const item = departmentData[index] || { name: '' };
    return (
      <text x={x} y={y} fill="#374151" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12}>
        {`${item.name} ${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  function generateMonthlyData(appts: Appointment[], billsList: Bill[], patientsList: Patient[]) {
    const now = new Date();

    // Build the last 6 months, keyed by "Mon YYYY" for uniqueness across years
    const months = Array.from({ length: 6 }).map((_, idx) => {
      const d = new Date(now);
      d.setMonth(d.getMonth() - (5 - idx));
      const key = d.toLocaleString('default', { month: 'short', year: 'numeric' });
      const label = d.toLocaleString('default', { month: 'short' });
      return { key, label, patients: new Set<string>(), appointments: 0, revenue: 0 };
    });

    const monthMap = new Map(months.map((m) => [m.key, m]));

    const normalizeDate = (value: any) => {
      if (!value) return null;
      const d = value instanceof Date ? value : new Date(value);
      return Number.isNaN(d.getTime()) ? null : d;
    };

    const getPatientId = (appt: Appointment) => {
      if (!appt.patient) return '';
      if (typeof appt.patient === 'string') return appt.patient;
      if (typeof appt.patient === 'object') {
        return String((appt.patient as any)._id || (appt.patient as any).id || appt.patient);
      }
      return '';
    };

    // Count appointments and unique patients per month
    appts.forEach((appt) => {
      const date = normalizeDate((appt as any).scheduledAt || (appt as any).date || (appt as any).createdAt);
      if (!date) return;
      const monthKey = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      const entry = monthMap.get(monthKey);
      if (!entry) return;

      entry.appointments += 1;
      const patientId = getPatientId(appt);
      if (patientId) entry.patients.add(patientId);
    });

    // Add revenue per month from bills
    billsList.forEach((bill) => {
      const date = normalizeDate((bill as any).date || (bill as any).createdAt || (bill as any).created);
      if (!date) return;
      const monthKey = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      const entry = monthMap.get(monthKey);
      if (!entry) return;

      entry.revenue += bill.amount || 0;
    });

    return months.map((m) => ({
      month: m.label,
      patients: m.patients.size,
      appointments: m.appointments,
      revenue: m.revenue,
    }));
  }

  // Compute top doctors from real appointments data
  const computeTopDoctors = () => {
    const doctorMap: Record<string, { name: string; appointments: number; uniquePatients: Set<string> }> = {};
    for (const appt of appointments) {
      const d = (appt as any).doctor;
      let name = '';
      if (!d) continue;
      if (typeof d === 'string') name = d;
      else if (typeof d === 'object') name = d.name || d.fullName || d.displayName || JSON.stringify(d);
      if (!name) continue;
      if (!doctorMap[name]) doctorMap[name] = { name, appointments: 0, uniquePatients: new Set() };
      doctorMap[name].appointments += 1;
      const pid = (appt as any).patient?._id || (appt as any).patient || '';
      if (pid) doctorMap[name].uniquePatients.add(String(pid));
    }

    const totalAppts = Object.values(doctorMap).reduce((s, d) => s + d.appointments, 0) || 1;

    // approximate revenue per doctor by splitting totalRevenue by appointment share
    const top = Object.values(doctorMap)
      .map((d) => ({ name: d.name, patients: d.uniquePatients.size, appointments: d.appointments, revenue: Math.round((d.appointments / totalAppts) * totalRevenue) }))
      .sort((a, b) => b.appointments - a.appointments)
      .slice(0, 4);

    // Fallback: if no appointment data or top is empty, map from doctors list
    if (top.length === 0 && doctors.length > 0) {
      return doctors.slice(0, 4).map((doc) => ({ name: doc.name || doc.email?.split('@')[0], patients: 0, appointments: 0, revenue: 0 }));
    }

    return top;
  };

  const topDoctors = computeTopDoctors();

  const handleExport = () => {
    const container = reportRef.current;
    if (!container) {
      alert('Report not ready for export');
      return;
    }

    // collect svg charts from the report (Recharts outputs SVG)
    const svgs = Array.from(container.querySelectorAll('svg'));
    const svgsHtml = svgs.map((s) => s.outerHTML).join('<div style="height:18px"></div>');

    const title = 'MediCare HMS - Reports';
    const generatedAt = new Date().toLocaleString();

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:24px}
        .header{display:flex;justify-content:space-between;align-items:center}
        .header h1{margin:0;font-size:20px}
        .summary{display:flex;gap:12px;margin-top:12px}
        .card{flex:1;padding:12px;border:1px solid #e5e7eb;border-radius:8px;background:#fff}
        h3{margin:0 0 8px 0;font-size:13px;color:#374151}
        p.value{font-size:18px;margin:0;color:#111}
        .charts{margin-top:18px}
        .footer{margin-top:28px;font-size:12px;color:#6b7280}
      </style>
    </head><body>
      <div class="header"><div><h1>MediCare HMS</h1><div>Reports Export</div></div><div>${generatedAt}</div></div>
      <div class="summary">
        <div class="card"><h3>Total Patients</h3><p class="value">${totalPatients}</p></div>
        <div class="card"><h3>Appointments</h3><p class="value">${totalAppointments}</p></div>
        <div class="card"><h3>Total Revenue</h3><p class="value">₹${totalRevenue.toLocaleString()}</p></div>
      </div>
      <div class="charts">${svgsHtml}</div>
      <div class="footer">Generated by MediCare HMS — ${generatedAt}</div>
    </body></html>`;

    const w = window.open('', '_blank');
    if (!w) {
      alert('Unable to open export window (blocked by browser)');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    // give browser a moment to render SVGs then print
    setTimeout(() => {
      try { w.focus(); w.print(); } catch (e) { console.error(e); }
    }, 500);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" ref={reportRef}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h2 className="text-gray-900">Reports & Analytics</h2>
            <p className="text-sm text-gray-500">View comprehensive hospital reports</p>
          </div>
        </div>
        <button onClick={handleExport} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export Reports
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <Users className="w-8 h-8 mb-3 opacity-80" />
          <p className="text-blue-100 mb-1">Total Patients</p>
          <h3 className="text-white">{totalPatients.toLocaleString()}</h3>
          <p className="text-xs text-blue-100 mt-2">+12% from last month</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
          <Calendar className="w-8 h-8 mb-3 opacity-80" />
          <p className="text-green-100 mb-1">Appointments</p>
          <h3 className="text-white">{totalAppointments.toLocaleString()}</h3>
          <p className="text-xs text-green-100 mt-2">+8% from last month</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <TrendingUp className="w-8 h-8 mb-3 opacity-80" />
          <p className="text-purple-100 mb-1">Revenue</p>
          <h3 className="text-white">₹{(totalRevenue / 100000).toFixed(1)}L</h3>
          <p className="text-xs text-purple-100 mt-2">+15% from last month</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white">
          <CreditCard className="w-8 h-8 mb-3 opacity-80" />
          <p className="text-orange-100 mb-1">Avg. Bill Value</p>
          <h3 className="text-white">₹{avgBillValue.toFixed(0)}</h3>
          <p className="text-xs text-orange-100 mt-2">+5% from last month</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h3 className="text-gray-900 mb-6">Monthly Patient Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="patients" stroke="#3B82F6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h3 className="text-gray-900 mb-6">Department-wise Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={departmentData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={90}
                innerRadius={50}
                dataKey="value"
                stroke="#ffffff"
                strokeWidth={2}
                paddingAngle={2}
              >
                {departmentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h3 className="text-gray-900 mb-6">Revenue & Appointments Comparison</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="appointments" fill="#3B82F6" name="Appointments" />
            <Bar yAxisId="right" dataKey="revenue" fill="#10B981" name="Revenue (₹)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h3 className="text-gray-900 mb-4">Top Performing Doctors</h3>
          <div className="space-y-3">
            {topDoctors.map((doctor, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-gray-900">{doctor.name}</p>
                  <p className="text-xs text-gray-500">{doctor.patients} patients</p>
                </div>
                <p className="text-gray-900">₹{(doctor.revenue / 1000).toFixed(1)}K</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h3 className="text-gray-900 mb-4">Recent Activities</h3>
          <div className="space-y-3">
            {[
              { action: 'New patient registered', time: '5 mins ago', type: 'patient' },
              { action: 'Invoice #INV001240 generated', time: '12 mins ago', type: 'billing' },
              { action: 'Appointment scheduled', time: '25 mins ago', type: 'appointment' },
              { action: 'Medicine stock updated', time: '1 hour ago', type: 'pharmacy' },
              { action: 'Report exported', time: '2 hours ago', type: 'report' },
            ].map((activity, index) => (
              <div key={index} className="flex items-start gap-3 p-3 border-l-2 border-indigo-500 bg-gray-50">
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{activity.action}</p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
