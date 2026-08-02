import React, { useState, useEffect } from 'react';
import { Search, Download, Filter, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { ApiClient } from '../../../utils/api';

const actions = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'PASSWORD_CHANGE', 'STATUS_CHANGE'];

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [stats, setStats] = useState<any>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params: any = {
        limit,
        skip: (page - 1) * limit,
      };
      if (actionFilter) params.action = actionFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await ApiClient.getAuditLogs(params);
      if (response?.success) {
        setLogs(response.data || []);
        setTotal(response.pagination?.total || 0);
      } else {
        setLogs([]);
        setTotal(0);
      }
    } catch (err: any) {
      console.error('Failed to load audit logs', err);
      toast.error(err?.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await ApiClient.getAuditLogStats();
      if (response?.success) {
        setStats(response.data);
      }
    } catch (err) {
      console.warn('Unable to load audit stats', err);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [page]);

  const handleSearch = async () => {
    setPage(1);
    await fetchLogs();
  };

  const handleResetFilters = () => {
    setActionFilter('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const handleExport = async () => {
    try {
      await ApiClient.exportAuditLogs();
      toast.success('Audit logs export started');
    } catch (err: any) {
      console.error('Export failed', err);
      toast.error(err?.message || 'Failed to export audit logs');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Audit Trail</h1>
          <p className="mt-2 text-sm text-gray-600">
            Review system activity and security events for administrative audit.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            onClick={fetchStats}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-900"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">Total Logs</p>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{stats.totalLogs ?? 0}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">Failed Actions</p>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{stats.failedActions ?? 0}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">Success Rate</p>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{stats.successRate ?? '0%'}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">Top Actors</p>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{Array.isArray(stats.topActors) ? stats.topActors.length : 0}</p>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Action</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            >
              <option value="">All actions</option>
              {actions.map((action) => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={handleSearch}
              className="inline-flex items-center gap-2 w-full justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Search className="w-4 h-4" />
              Apply
            </button>
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-2 w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Filter className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">When</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Action</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Target</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Actor</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Performed By</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                    Loading audit logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                    No audit log records found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id || `${log.userId}-${log.createdAt}`} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-gray-700">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{log.action}</td>
                    <td className="px-4 py-3 text-gray-700">
                      <div>{log.targetType}</div>
                      <div className="text-xs text-gray-500">{log.targetId || '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div>{log.userId?.name || log.userId?.email || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{log.userId?.role || ''}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div>{log.performedBy?.name || log.performedBy?.email || 'System'}</div>
                      <div className="text-xs text-gray-500">{log.performedBy?.role || ''}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 wrap-break-word max-w-65">{log.details || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-600">Showing {Math.min(logs.length, limit)} of {total} records</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page <= 1}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">Page {page}</span>
            <button
              onClick={() => setPage((prev) => prev + 1)}
              disabled={page * limit >= total}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
