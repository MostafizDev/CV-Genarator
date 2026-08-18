import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Building2,
  Briefcase,
  FileText,
  AlertCircle,
  Loader2,
  UserX,
} from 'lucide-react';
import type { GenerateResponse, GeneratedCV, Profile } from '../types';
import { generateCvAndCoverLetter, exportPdf, getProfile, getSettings } from '../api/client';
import { downloadBlob, sanitizeForFilename } from '../utils/pdfExport';
import { CvPreviewPanel } from '../components/CvPreviewPanel';
import { CoverLetterPreviewPanel } from '../components/CoverLetterPreviewPanel';

export const NewApplicationPage: React.FC = () => {
  const [company, setCompany] = useState('');
  const [position, setPosition] = useState('');
  const [jobDescription, setJobDescription] = useState('');

  const [hasConfiguredProvider, setHasConfiguredProvider] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingContext, setLoadingContext] = useState(true);

  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Editable content, seeded from the generated result
  const [editedCv, setEditedCv] = useState<GeneratedCV | null>(null);
  const [editedCoverLetter, setEditedCoverLetter] = useState('');

  // Export state
  const [exportingCv, setExportingCv] = useState(false);
  const [exportingCoverLetter, setExportingCoverLetter] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [profileData, settingsData] = await Promise.all([getProfile(), getSettings()]);
        setProfile(profileData);
        const withKeys = settingsData.filter((s) => s.api_key && s.api_key.trim().length > 0);
        setHasConfiguredProvider(withKeys.length > 0);
      } catch {
        // Non-fatal: generation will still surface a clear error if something's missing
      } finally {
        setLoadingContext(false);
      }
    })();
  }, []);

  const isProfileEmpty =
    !loadingContext &&
    profile &&
    !profile.full_name &&
    profile.experiences.length === 0 &&
    profile.skills.length === 0;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !position.trim() || !jobDescription.trim()) {
      setError('Please fill in Company, Position, and Job Description before generating.');
      return;
    }

    try {
      setGenerating(true);
      setError(null);
      setExportError(null);
      const res = await generateCvAndCoverLetter({
        company: company.trim(),
        position: position.trim(),
        job_description: jobDescription.trim(),
      });
      setResult(res);
      setEditedCv(res.cv);
      setEditedCoverLetter(res.cover_letter);
    } catch (err: any) {
      setError(err.message || 'Generation failed. Check your API settings and profile.');
    } finally {
      setGenerating(false);
    }
  };

  const updateEditedCv = (updater: (prev: GeneratedCV) => GeneratedCV) => {
    setEditedCv((prev) => (prev ? updater(prev) : prev));
  };

  const handleExportCv = async () => {
    if (!editedCv) return;
    try {
      setExportingCv(true);
      setExportError(null);
      const blob = await exportPdf('cv', editedCv);
      downloadBlob(blob, `CV_${sanitizeForFilename(company)}.pdf`);
    } catch (err: any) {
      setExportError(err.message || 'Failed to export CV as PDF.');
    } finally {
      setExportingCv(false);
    }
  };

  const handleExportCoverLetter = async () => {
    if (!editedCoverLetter.trim()) return;
    try {
      setExportingCoverLetter(true);
      setExportError(null);
      const blob = await exportPdf('cover_letter', editedCoverLetter);
      downloadBlob(blob, `CoverLetter_${sanitizeForFilename(company)}.pdf`);
    } catch (err: any) {
      setExportError(err.message || 'Failed to export cover letter as PDF.');
    } finally {
      setExportingCoverLetter(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="pb-6 border-b border-slate-200">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
          <Sparkles className="w-7 h-7 text-amber-500" />
          <span>Tailor Application</span>
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Paste a job posting to generate an ATS-optimized, factual CV and tailored cover letter in seconds.
        </p>
      </div>

      {isProfileEmpty && (
        <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start space-x-3 text-sm">
          <UserX className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Your profile is empty</p>
            <p className="mt-0.5 text-xs text-amber-800">
              Generation needs your name, skills, or experience to tailor anything.{' '}
              <Link to="/profile" className="underline font-medium hover:text-amber-950">
                Fill in your Profile
              </Link>{' '}
              first.
            </p>
          </div>
        </div>
      )}

      {!loadingContext && !hasConfiguredProvider && (
        <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start space-x-3 text-sm">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">No AI provider configured</p>
            <p className="mt-0.5 text-xs text-amber-800">
              Add an API key for at least one provider in{' '}
              <Link to="/settings" className="underline font-medium hover:text-amber-950">
                Settings
              </Link>{' '}
              before generating.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start space-x-3 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Generation Error</p>
            <p className="mt-0.5 text-xs text-rose-700">{error}</p>
            <div className="mt-2 flex space-x-4 text-xs font-medium">
              <Link to="/profile" className="underline hover:text-rose-900">
                Check Profile
              </Link>
              <Link to="/settings" className="underline hover:text-rose-900">
                Check API Key in Settings
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main 2-Column Grid */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Input Form (5 cols on lg) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          <h2 className="text-base font-semibold text-slate-900 flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Briefcase className="w-4 h-4 text-sky-600" />
            <span>Target Job Details</span>
          </h2>

          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Company Name *
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Stripe, OpenAI, Google"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Position Title *
              </label>
              <div className="relative">
                <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="e.g. Senior Full Stack Engineer"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Job Description *
              </label>
              <textarea
                rows={10}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the full job posting, responsibilities, requirements, and qualifications here..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
                required
              />
            </div>

            <button
              type="submit"
              disabled={generating || !hasConfiguredProvider}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 active:from-sky-800 active:to-indigo-800 text-white font-semibold text-sm rounded-xl shadow-md shadow-sky-500/20 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Tailoring CV & Cover Letter...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Generate Tailored Application</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Previews (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-6">
          {!result && !generating && (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
              <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">No application generated yet</h3>
              <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
                Fill in the job details on the left and click &quot;Generate Tailored Application&quot; to produce your customized CV and cover letter.
              </p>
            </div>
          )}

          {generating && (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
              <Loader2 className="w-10 h-10 text-sky-600 animate-spin mx-auto mb-4" />
              <h3 className="text-base font-semibold text-slate-900">AI is tailoring your application...</h3>
              <p className="text-slate-500 text-xs mt-1 max-w-md mx-auto">
                Analyzing job description keywords, highlighting your matching achievements, and drafting a high-impact cover letter.
              </p>
            </div>
          )}

          {result && editedCv && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <CvPreviewPanel cv={editedCv} onChange={updateEditedCv} onExport={handleExportCv} exporting={exportingCv} />
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
          )}
        </div>
      </div>
    </div>
  );
};
