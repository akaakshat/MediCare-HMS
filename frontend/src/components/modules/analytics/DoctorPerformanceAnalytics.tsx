import { useEffect, useState } from 'react';
import { ArrowLeft, TrendingUp, Users, Calendar, CreditCard } from 'lucide-react';
import { ApiClient } from '../../../utils/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';

export function DoctorPerformanceAnalytics({ onBack }: { onBack: () => void }) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await ApiClient.get('/analytics/doctor-performance');
        if (!response?.success) {
          throw new Error(response?.message || 'Unable to load analytics');
        }
        setAnalytics(response.analytics);
      } catch (err: any) {
        console.error('Doctor analytics failed', err);
        setError(err?.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="text-sm text-blue-600 hover:underline">&larr; Back</button>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="text-sm text-blue-600 hover:underline">&larr; Back</button>
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-yellow-700">No analytics data available.</div>
      </div>
    );
  }

  const metrics = analytics.metrics || {};
  const trends = analytics.trends || {};
  const topDiagnoses = analytics.topDiagnoses || [];
  const topProcedures = analytics.topProcedures || [];

  const trendData = Array.isArray(trends.consultationTrend) ? trends.consultationTrend : [];
  const revenueTrendData = Array.isArray(trends.revenueTrend) ? trends.revenueTrend : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h2 className="text-gray-900">Doctor Performance Analytics</h2>
            <p className="text-sm text-gray-500">Secure, role-based performance metrics for doctors.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-3 text-indigo-600"><Users className="w-5 h-5" /><span className="text-sm font-semibold">Avg. Patients / Day</span></div>
          <p className="mt-4 text-3xl font-semibold text-gray-900">{metrics.patientsPerDayAverage ?? 0}</p>
          <p className="mt-2 text-sm text-gray-500">Across selected period</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-3 text-green-600"><Calendar className="w-5 h-5" /><span className="text-sm font-semibold">Completion Rate</span></div>
          <p className="mt-4 text-3xl font-semibold text-gray-900">{metrics.completionRate ?? 0}%</p>
          <p className="mt-2 text-sm text-gray-500">Of scheduled appointments</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-3 text-purple-600"><CreditCard className="w-5 h-5" /><span className="text-sm font-semibold">Revenue</span></div>
          <p className="mt-4 text-3xl font-semibold text-gray-900">₹{(metrics.revenue?.custom ?? 0).toLocaleString()}</p>
          <p className="mt-2 text-sm text-gray-500">Custom period revenue</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-3 text-orange-600"><TrendingUp className="w-5 h-5" /><span className="text-sm font-semibold">Follow-up Rate</span></div>
          <p className="mt-4 text-3xl font-semibold text-gray-900">{metrics.followUpRate ?? 0}%</p>
          <p className="mt-2 text-sm text-gray-500">Follow-up appointments share</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-gray-900 mb-4">Consultation Trend</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" name="Consultations" stroke="#3B82F6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-gray-900 mb-4">Revenue Trend</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" name="Revenue" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-gray-900 mb-4">Top Diagnoses</h3>
          <div className="space-y-3">
            {topDiagnoses.length > 0 ? topDiagnoses.map((item: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-900">{item.diagnosis}</span>
                <span className="text-sm font-semibold text-gray-700">{item.count}</span>
              </div>
            )) : <p className="text-sm text-gray-500">No diagnosis history available.</p>}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-gray-900 mb-4">Top Procedures</h3>
          <div className="space-y-3">
            {topProcedures.length > 0 ? topProcedures.map((item: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-900">{item.procedure}</span>
                <span className="text-sm font-semibold text-gray-700">{item.count}</span>
              </div>
            )) : <p className="text-sm text-gray-500">No procedure history available.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
