import React, { useState } from 'react';
import {
  FileText,
  Copy,
  Check,
  Code2,
  Pencil,
  Award,
  GraduationCap,
  FolderGit2,
  Download,
  Loader2,
} from 'lucide-react';
import type { GeneratedCV } from '../types';

interface CvPreviewPanelProps {
  cv: GeneratedCV;
  onChange: (updater: (prev: GeneratedCV) => GeneratedCV) => void;
  onExport: () => void;
  exporting: boolean;
  title?: string;
}

export const CvPreviewPanel: React.FC<CvPreviewPanelProps> = ({
  cv,
  onChange,
  onExport,
  exporting,
  title = 'Tailored CV Output',
}) => {
  const [viewMode, setViewMode] = useState<'structured' | 'json'>('structured');
  const [copied, setCopied] = useState(false);

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(cv, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const updateField = (field: keyof GeneratedCV, value: any) => {
    onChange((prev) => ({ ...prev, [field]: value }));
  };

  const updateExperienceField = (index: number, field: string, value: any) => {
    onChange((prev) => {
      const experience = [...(prev.experience || [])];
      experience[index] = { ...experience[index], [field]: value } as any;
      return { ...prev, experience };
    });
  };

  const updateProjectField = (index: number, field: string, value: any) => {
    onChange((prev) => {
      const projects = [...(prev.projects || [])];
      projects[index] = { ...projects[index], [field]: value } as any;
      return { ...prev, projects };
    });
  };

  const updateCertificationField = (index: number, field: string, value: any) => {
    onChange((prev) => {
      const certifications = [...(prev.certifications || [])];
      certifications[index] = { ...certifications[index], [field]: value } as any;
      return { ...prev, certifications };
    });
  };

  const updateEducationField = (index: number, field: string, value: any) => {
    onChange((prev) => {
      const education = [...(prev.education || [])];
      education[index] = { ...education[index], [field]: value } as any;
      return { ...prev, education };
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="flex items-center justify-between p-4 bg-slate-900 text-white">
        <div className="flex items-center space-x-2">
          <FileText className="w-4 h-4 text-sky-400" />
          <span className="font-semibold text-sm">{title}</span>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('structured')}
              className={`flex items-center space-x-1 px-2.5 py-1 text-xs rounded-md transition ${
                viewMode === 'structured'
                  ? 'bg-sky-600 text-white font-medium shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Pencil className="w-3 h-3" />
              <span>Edit</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('json')}
              className={`flex items-center space-x-1 px-2.5 py-1 text-xs rounded-md transition ${
                viewMode === 'json'
                  ? 'bg-sky-600 text-white font-medium shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 className="w-3 h-3" />
              <span>JSON</span>
            </button>
          </div>

          <button
            type="button"
            onClick={copyJson}
            className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition border border-slate-700"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy JSON'}</span>
          </button>
        </div>
      </div>

      <div className="p-6 max-h-[600px] overflow-y-auto">
        {viewMode === 'json' ? (
          <pre className="text-xs font-mono bg-slate-900 text-emerald-400 p-4 rounded-xl overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(cv, null, 2)}
          </pre>
        ) : (
          <div className="space-y-6 text-slate-800 text-sm">
            {/* Header / Contact Info */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Header <span className="normal-case font-normal text-slate-400">(shown at the top of the PDF)</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <input
                  type="text"
                  value={cv.full_name || ''}
                  onChange={(e) => updateField('full_name', e.target.value)}
                  placeholder="Full Name"
                  className="sm:col-span-2 font-semibold text-sm px-2 py-1.5 rounded border border-transparent hover:border-slate-200 focus:border-sky-500 focus:outline-none transition bg-white"
                />
                <input
                  type="text"
                  value={cv.email || ''}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="Email"
                  className="text-xs px-2 py-1.5 rounded border border-transparent hover:border-slate-200 focus:border-sky-500 focus:outline-none transition bg-white"
                />
                <input
                  type="text"
                  value={cv.phone || ''}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="Phone"
                  className="text-xs px-2 py-1.5 rounded border border-transparent hover:border-slate-200 focus:border-sky-500 focus:outline-none transition bg-white"
                />
                <input
                  type="text"
                  value={cv.location || ''}
                  onChange={(e) => updateField('location', e.target.value)}
                  placeholder="Location"
                  className="text-xs px-2 py-1.5 rounded border border-transparent hover:border-slate-200 focus:border-sky-500 focus:outline-none transition bg-white"
                />
                <input
                  type="text"
                  value={cv.linkedin || ''}
                  onChange={(e) => updateField('linkedin', e.target.value)}
                  placeholder="LinkedIn URL"
                  className="text-xs px-2 py-1.5 rounded border border-transparent hover:border-slate-200 focus:border-sky-500 focus:outline-none transition bg-white"
                />
                <input
                  type="text"
                  value={cv.portfolio_url || ''}
                  onChange={(e) => updateField('portfolio_url', e.target.value)}
                  placeholder="Portfolio URL"
                  className="sm:col-span-2 text-xs px-2 py-1.5 rounded border border-transparent hover:border-slate-200 focus:border-sky-500 focus:outline-none transition bg-white"
                />
              </div>
            </div>

            {/* Summary */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Summary</h4>
              <textarea
                rows={3}
                value={cv.summary || ''}
                onChange={(e) => updateField('summary', e.target.value)}
                className="w-full text-xs sm:text-sm leading-relaxed bg-sky-50/50 p-3 rounded-lg border border-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
              />
            </div>

            {/* Skills */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Skills <span className="normal-case font-normal text-slate-400">(one per line)</span>
              </h4>
              <textarea
                rows={3}
                value={(cv.skills || []).join('\n')}
                onChange={(e) => updateField('skills', e.target.value.split('\n'))}
                className="w-full text-xs bg-slate-50 p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
              />
            </div>

            {/* Experiences */}
            {cv.experience && cv.experience.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Experience</h4>
                <div className="space-y-4">
                  {cv.experience.map((exp: any, i: number) => (
                    <div key={i} className="border-l-2 border-sky-400 pl-3.5 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={exp.title || ''}
                          onChange={(e) => updateExperienceField(i, 'title', e.target.value)}
                          placeholder="Job Title"
                          className="font-semibold text-slate-900 text-sm px-2 py-1 rounded border border-transparent hover:border-slate-200 focus:border-sky-500 focus:outline-none transition bg-transparent"
                        />
                        <input
                          type="text"
                          value={exp.company || ''}
                          onChange={(e) => updateExperienceField(i, 'company', e.target.value)}
                          placeholder="Company"
                          className="text-xs font-medium text-sky-700 px-2 py-1 rounded border border-transparent hover:border-slate-200 focus:border-sky-500 focus:outline-none transition bg-transparent"
                        />
                        <input
                          type="text"
                          value={exp.start_date || ''}
                          onChange={(e) => updateExperienceField(i, 'start_date', e.target.value)}
                          placeholder="Start Date"
                          className="text-xs text-slate-500 px-2 py-1 rounded border border-transparent hover:border-slate-200 focus:border-sky-500 focus:outline-none transition bg-transparent"
                        />
                        <input
                          type="text"
                          value={exp.end_date || ''}
                          onChange={(e) => updateExperienceField(i, 'end_date', e.target.value)}
                          placeholder="End Date (or Present)"
                          className="text-xs text-slate-500 px-2 py-1 rounded border border-transparent hover:border-slate-200 focus:border-sky-500 focus:outline-none transition bg-transparent"
                        />
                      </div>
                      <textarea
                        rows={Math.max(3, (exp.bullet_points || []).length)}
                        value={(exp.bullet_points || []).join('\n')}
                        onChange={(e) => updateExperienceField(i, 'bullet_points', e.target.value.split('\n'))}
                        placeholder="Achievement bullet points, one per line"
                        className="w-full text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Projects */}
            {cv.projects && cv.projects.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1">
                  <FolderGit2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Projects</span>
                </h4>
                <div className="grid grid-cols-1 gap-2.5">
                  {cv.projects.map((proj: any, i: number) => (
                    <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-xs space-y-1.5">
                      <input
                        type="text"
                        value={proj.name || ''}
                        onChange={(e) => updateProjectField(i, 'name', e.target.value)}
                        placeholder="Project Name"
                        className="font-semibold text-slate-900 w-full px-2 py-1 rounded border border-transparent hover:border-slate-200 focus:border-sky-500 focus:outline-none transition bg-transparent"
                      />
                      <input
                        type="text"
                        value={proj.tech_stack || ''}
                        onChange={(e) => updateProjectField(i, 'tech_stack', e.target.value)}
                        placeholder="Tech Stack"
                        className="text-slate-500 text-[11px] w-full px-2 py-1 rounded border border-transparent hover:border-slate-200 focus:border-sky-500 focus:outline-none transition bg-transparent"
                      />
                      <textarea
                        rows={2}
                        value={proj.description || ''}
                        onChange={(e) => updateProjectField(i, 'description', e.target.value)}
                        placeholder="Description"
                        className="text-slate-600 leading-relaxed w-full px-2 py-1.5 rounded border border-transparent hover:border-slate-200 focus:border-sky-500 focus:outline-none transition bg-transparent"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education & Certs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {cv.certifications && cv.certifications.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1">
                    <Award className="w-3.5 h-3.5 text-slate-500" />
                    <span>Certifications</span>
                  </h4>
                  <div className="space-y-1.5">
                    {cv.certifications.map((c: any, i: number) => (
                      <div key={i} className="text-xs text-slate-700 bg-slate-50 p-2 rounded border border-slate-100 space-y-1">
                        <input
                          type="text"
                          value={c.name || ''}
                          onChange={(e) => updateCertificationField(i, 'name', e.target.value)}
                          placeholder="Certification Name"
                          className="font-medium w-full px-1.5 py-0.5 rounded border border-transparent hover:border-slate-200 focus:border-sky-500 focus:outline-none transition bg-transparent"
                        />
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={c.issuer || ''}
                            onChange={(e) => updateCertificationField(i, 'issuer', e.target.value)}
                            placeholder="Issuer"
                            className="text-[11px] text-slate-500 w-full px-1.5 py-0.5 rounded border border-transparent hover:border-slate-200 focus:border-sky-500 focus:outline-none transition bg-transparent"
                          />
                          <input
                            type="text"
                            value={c.date_earned || ''}
                            onChange={(e) => updateCertificationField(i, 'date_earned', e.target.value)}
                            placeholder="Date"
                            className="text-[11px] text-slate-500 w-24 shrink-0 px-1.5 py-0.5 rounded border border-transparent hover:border-slate-200 focus:border-sky-500 focus:outline-none transition bg-transparent"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {cv.education && cv.education.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-500" />
                    <span>Education</span>
                  </h4>
                  <div className="space-y-1.5">
                    {cv.education.map((e: any, i: number) => (
                      <div key={i} className="text-xs text-slate-700 bg-slate-50 p-2 rounded border border-slate-100 space-y-1">
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={e.degree || ''}
                            onChange={(ev) => updateEducationField(i, 'degree', ev.target.value)}
                            placeholder="Degree"
                            className="font-medium w-full px-1.5 py-0.5 rounded border border-transparent hover:border-slate-200 focus:border-sky-500 focus:outline-none transition bg-transparent"
                          />
                          <input
                            type="text"
                            value={e.field || ''}
                            onChange={(ev) => updateEducationField(i, 'field', ev.target.value)}
                            placeholder="Field"
                            className="font-medium w-full px-1.5 py-0.5 rounded border border-transparent hover:border-slate-200 focus:border-sky-500 focus:outline-none transition bg-transparent"
                          />
                        </div>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={e.institution || ''}
                            onChange={(ev) => updateEducationField(i, 'institution', ev.target.value)}
                            placeholder="Institution"
                            className="text-[11px] text-slate-500 w-full px-1.5 py-0.5 rounded border border-transparent hover:border-slate-200 focus:border-sky-500 focus:outline-none transition bg-transparent"
                          />
                          <input
                            type="text"
                            value={e.graduation_year || ''}
                            onChange={(ev) => updateEducationField(i, 'graduation_year', ev.target.value)}
                            placeholder="Year"
                            className="text-[11px] text-slate-500 w-20 shrink-0 px-1.5 py-0.5 rounded border border-transparent hover:border-slate-200 focus:border-sky-500 focus:outline-none transition bg-transparent"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <span className="text-[11px] text-slate-400">Edits here are included when you export.</span>
        <button
          type="button"
          onClick={onExport}
          disabled={exporting}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          <span>{exporting ? 'Exporting...' : 'Export PDF'}</span>
        </button>
      </div>
    </div>
  );
};
