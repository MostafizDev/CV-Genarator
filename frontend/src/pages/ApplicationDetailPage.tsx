import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Cpu,
  Calendar,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  FileText,
} from 'lucide-react';
import type { Application, ApplicationStatus, GeneratedCV } from '../types';
import { APPLICATION_STATUSES } from '../types';
import { getApplication, updateApplication, exportPdf } from '../api/client';
import { downloadBlob, sanitizeForFilename } from '../utils/pdfExport';
import { CvPreviewPanel } from '../components/CvPreviewPanel';
import { CoverLetterPreviewPanel } from '../components/CoverLetterPreviewPanel';

const STATUS_STYLES: Record<string, string> = {
  Generated: 'bg-slate-100 text-slate-700 border-slate-200',
  Applied: 'bg-sky-50 text-sky-700 border-sky-200',
  Interview: 'bg-amber-50 text-amber-700 border-amber-200',
  Offer: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Rejected: 'bg-rose-50 text-rose-700 border-rose-200',
};

export const ApplicationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editedCv, setEditedCv] = useState<GeneratedCV | null>(null);
  const [editedCoverLetter, setEditedCoverLetter] = useState('');
  const [jobDescExpanded, setJobDescExpanded] = useState(false);

  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [exportingCv, setExportingCv] = useState(false);
  const [exportingCoverLetter, setExportingCoverLetter] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getApplication(Number(id));
        setApplication(data);
        setEditedCv(data.generated_cv);
        setEditedCoverLetter(data.generated_cover_letter);
      } catch (err: any) {
        setError(err.message || 'Failed to load this application.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleStatusChange = async (newStatus: ApplicationStatus) => {
    if (!application) return;
    const previous = application.status;
    setApplication({ ...application, status: newStatus });
    try {
      setUpdatingStatus(true);
      await updateApplication(application.id, { status: newStatus });
    } catch (err: any) {
      setApplication((prev) => (prev ? { ...prev, status: previous } : prev));
      setError(err.message || 'Failed to update status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const updateEditedCv = (updater: (prev: GeneratedCV) => GeneratedCV) => {
    setEditedCv((prev) => (prev ? updater(prev) : prev));
  };

  const handleExportCv = async () => {
    if (!editedCv || !application) return;
    try {
      setExportingCv(true);
      setExportError(null);
      const blob = await exportPdf('cv', editedCv);
      downloadBlob(blob, `CV_${sanitizeForFilename(application.company)}.pdf`);
    } catch (err: any) {
      setExportError(err.message || 'Failed to export CV as PDF.');
    } finally {
      setExportingCv(false);
    }
  };

  const handleExportCoverLetter = async () => {
    if (!editedCoverLetter.trim() || !application) return;
    try {
      setExportingCoverLetter(true);
      setExportError(null);
      const blob = await exportPdf('cover_letter', editedCoverLetter);
      downloadBlob(blob, `CoverLetter_${sanitizeForFilename(application.company)}.pdf`);
    } catch (err: any) {
      setExportError(err.message || 'Failed to export cover letter as PDF.');
    } finally {
      setExportingCoverLetter(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
        <p className="mt-3 text-sm text-slate-500 font-medium">Loading application...</p>
      </div>
    );
  }

  if (error && !application) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link to="/tracker" className="inline-flex items-center space-x-1.5 text-sm text-slate-500 hover:text-slate-800 transition mb-6">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Tracker</span>
        </Link>
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start space-x-3 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!application) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link to="/tracker" className="inline-flex items-center space-x-1.5 text-sm text-slate-500 hover:text-slate-800 transition mb-6">
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Tracker</span>
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {application.position || 'Untitled Position'}
            </h1>
            <div className="mt-1.5 flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
              <span className="flex items-center space-x-1.5">
                <Building2 className="w-3.5 h-3.5" />
                <span>{application.company || 'Unknown company'}</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <Cpu className="w-3.5 h-3.5" />
                <span className="font-mono text-xs">
                  {application.provider_used}
                  {application.model_used ? ` / ${application.model_used}` : ''}
                </span>
              </span>
              <span className="flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {new Date(application.created_at).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Status
            </label>
            <div className="relative">
              <select
                value={application.status}
                onChange={(e) => handleStatusChange(e.target.value as ApplicationStatus)}
                disabled={updatingStatus}
                className={`pl-3 pr-8 py-2 rounded-lg text-sm font-semibold border focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition cursor-pointer appearance-none ${
                  STATUS_STYLES[application.status] || STATUS_STYLES.Generated
                }`}
              >
                {APPLICATION_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {updatingStatus && <Loader2 className="w-3.5 h-3.5 animate-spin absolute right-2.5 top-2.5 text-slate-400" />}
            </div>
          </div>
        </div>

        {/* Job description, collapsible */}
        {application.job_description && (
          <div className="mt-5 pt-5 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setJobDescExpanded((v) => !v)}
              className="flex items-center space-x-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-800 transition"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Job Description</span>
              {jobDescExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {jobDescExpanded && (
              <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded-lg border border-slate-100 max-h-96 overflow-y-auto">
                {application.job_description}
              </p>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start space-x-3 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm">{error}</p>
        </div>
      )}

      <div className="mt-6 space-y-6">
        {editedCv && (
          <CvPreviewPanel cv={editedCv} onChange={updateEditedCv} onExport={handleExportCv} exporting={exportingCv} />
        )}
        <CoverLetterPreviewPanel
          value={editedCoverLetter}
          onChange={setEditedCoverLetter}
          onExport={handleExportCoverLetter}
          exporting={exportingCoverLetter}
        />

        {exportError && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start space-x-3 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Export Error</p>
              <p className="mt-0.5 text-xs text-rose-700">{exportError}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
