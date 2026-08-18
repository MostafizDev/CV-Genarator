import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList,
  ArrowUpDown,
  AlertCircle,
  Loader2,
  Trash2,
  Inbox,
} from 'lucide-react';
import type { ApplicationListItem, ApplicationStatus } from '../types';
import { APPLICATION_STATUSES } from '../types';
import { listApplications, deleteApplication } from '../api/client';

type SortKey = 'company' | 'position' | 'provider_used' | 'status' | 'created_at';

const STATUS_STYLES: Record<string, string> = {
  Generated: 'bg-slate-100 text-slate-700 border-slate-200',
  Applied: 'bg-sky-50 text-sky-700 border-sky-200',
  Interview: 'bg-amber-50 text-amber-700 border-amber-200',
  Offer: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Rejected: 'bg-rose-50 text-rose-700 border-rose-200',
};

export const TrackerPage: React.FC = () => {
  const [applications, setApplications] = useState<ApplicationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'All'>('All');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listApplications();
      setApplications(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const handleDelete = async (id: number, company: string) => {
    if (!window.confirm(`Delete the application for "${company || 'this company'}"? This cannot be undone.`)) {
      return;
    }
    try {
      setDeletingId(id);
      await deleteApplication(id);
      setApplications((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete application.');
    } finally {
      setDeletingId(null);
    }
  };

  const visibleApplications = useMemo(() => {
    let list = applications;
    if (statusFilter !== 'All') {
      list = list.filter((a) => a.status === statusFilter);
    }
    const sorted = [...list].sort((a, b) => {
      const aVal = a[sortKey] || '';
      const bVal = b[sortKey] || '';
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [applications, statusFilter, sortKey, sortDir]);

  const SortHeader: React.FC<{ label: string; sortField: SortKey }> = ({ label, sortField }) => (
    <button
      type="button"
      onClick={() => toggleSort(sortField)}
      className="flex items-center space-x-1 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-800 transition"
    >
      <span>{label}</span>
      <ArrowUpDown className={`w-3 h-3 ${sortKey === sortField ? 'text-sky-600' : 'text-slate-300'}`} />
    </button>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="pb-6 border-b border-slate-200 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <ClipboardList className="w-7 h-7 text-sky-600" />
            <span>Application Tracker</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Every CV and cover letter you've generated, with status tracking through your job search.
          </p>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-2">Filter</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ApplicationStatus | 'All')}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition cursor-pointer"
          >
            <option value="All">All statuses</option>
            {APPLICATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="mt-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start space-x-3 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
          <p className="mt-3 text-sm text-slate-500 font-medium">Loading applications...</p>
        </div>
      ) : visibleApplications.length === 0 ? (
        <div className="mt-8 bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Inbox className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">
            {applications.length === 0 ? 'No applications yet' : 'No applications match this filter'}
          </h3>
          <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
            {applications.length === 0
              ? 'Generate a tailored CV and cover letter from New Application to see it appear here.'
              : 'Try a different status filter.'}
          </p>
        </div>
      ) : (
        <div className="mt-8 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-5 py-3">
                    <SortHeader label="Company" sortField="company" />
                  </th>
                  <th className="text-left px-5 py-3">
                    <SortHeader label="Position" sortField="position" />
                  </th>
                  <th className="text-left px-5 py-3">
                    <SortHeader label="Provider" sortField="provider_used" />
                  </th>
                  <th className="text-left px-5 py-3">
                    <SortHeader label="Status" sortField="status" />
                  </th>
                  <th className="text-left px-5 py-3">
                    <SortHeader label="Date" sortField="created_at" />
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {visibleApplications.map((app) => (
                  <tr key={app.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition">
                    <td className="px-5 py-3.5">
                      <Link to={`/tracker/${app.id}`} className="font-semibold text-slate-900 hover:text-sky-700 transition">
                        {app.company || 'Untitled'}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{app.position || '—'}</td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">
                      <span className="font-mono">{app.provider_used || '—'}</span>
                      {app.model_used && <span className="text-slate-400"> / {app.model_used}</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${
                          STATUS_STYLES[app.status] || STATUS_STYLES.Generated
                        }`}
                      >
                        {app.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">
                      {new Date(app.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(app.id, app.company)}
                        disabled={deletingId === app.id}
                        title="Delete application"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-50"
                      >
                        {deletingId === app.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
