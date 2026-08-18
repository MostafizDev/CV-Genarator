import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Link2,
  Globe,
  Briefcase,
  FolderGit2,
  Award,
  GraduationCap,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  X,
  FileText,
  Loader2,
  Sparkles,
} from 'lucide-react';
import type { Profile, Experience, Project, Certification, Education } from '../types';
import { getProfile, saveProfile, parseCv } from '../api/client';

export const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<Profile>({
    full_name: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    portfolio_url: '',
    summary: '',
    skills: [],
    experiences: [],
    projects: [],
    certifications: [],
    education: [],
  });

  const [newSkill, setNewSkill] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [parsingCv, setParsingCv] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Extracted text modal state
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [showExtractedModal, setShowExtractedModal] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);

  useEffect(() => {
    loadProfileData();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const data = await getProfile();
      setProfile({
        ...data,
        experiences: data.experiences || [],
        projects: data.projects || [],
        certifications: data.certifications || [],
        education: data.education || [],
        skills: data.skills || [],
      });
    } catch (err: any) {
      showToast(err.message || 'Failed to load profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      const saved = await saveProfile(profile);
      setProfile(saved);
      showToast('Profile saved successfully! All details are persisted.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setParsingCv(true);
      const result = await parseCv(file);

      // Auto-fill entire profile state with parsed data
      const parsed = result.parsed_profile;
      setProfile((prev) => ({
        ...prev,
        full_name: parsed.full_name || prev.full_name,
        email: parsed.email || prev.email,
        phone: parsed.phone || prev.phone,
        location: parsed.location || prev.location,
        linkedin: parsed.linkedin || prev.linkedin,
        portfolio_url: parsed.portfolio_url || prev.portfolio_url,
        summary: parsed.summary || prev.summary,
        skills: parsed.skills && parsed.skills.length > 0 ? parsed.skills : prev.skills,
        experiences: parsed.experiences && parsed.experiences.length > 0 ? parsed.experiences : prev.experiences,
        projects: parsed.projects && parsed.projects.length > 0 ? parsed.projects : prev.projects,
        certifications: parsed.certifications && parsed.certifications.length > 0 ? parsed.certifications : prev.certifications,
        education: parsed.education && parsed.education.length > 0 ? parsed.education : prev.education,
      }));

      setExtractedText(result.raw_text);
      showToast(
        '✨ Resume parsed & auto-filled successfully! All fields have been populated. Review and save when ready.',
        'success'
      );
    } catch (err: any) {
      showToast(
        err.message || 'Failed to parse resume. Check that your OpenAI API key is set in Settings.',
        'error'
      );
    } finally {
      setParsingCv(false);
      e.target.value = '';
    }
  };

  // Skill Handlers
  const addSkill = () => {
    if (!newSkill.trim()) return;
    const skillsToAdd = newSkill
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s && !profile.skills.includes(s));
    setProfile({ ...profile, skills: [...profile.skills, ...skillsToAdd] });
    setNewSkill('');
  };

  const removeSkill = (index: number) => {
    const updated = [...profile.skills];
    updated.splice(index, 1);
    setProfile({ ...profile, skills: updated });
  };

  // Experience Handlers
  const addExperience = () => {
    const newExp: Experience = {
      company: '',
      title: '',
      start_date: '',
      end_date: '',
      bullet_points: [''],
    };
    setProfile({ ...profile, experiences: [newExp, ...profile.experiences] });
  };

  const updateExperience = (index: number, field: keyof Experience, value: any) => {
    const updated = [...profile.experiences];
    updated[index] = { ...updated[index], [field]: value };
    setProfile({ ...profile, experiences: updated });
  };

  const removeExperience = (index: number) => {
    const updated = [...profile.experiences];
    updated.splice(index, 1);
    setProfile({ ...profile, experiences: updated });
  };

  const addExperienceBullet = (expIndex: number) => {
    const updated = [...profile.experiences];
    updated[expIndex].bullet_points.push('');
    setProfile({ ...profile, experiences: updated });
  };

  const updateExperienceBullet = (expIndex: number, bulletIndex: number, text: string) => {
    const updated = [...profile.experiences];
    updated[expIndex].bullet_points[bulletIndex] = text;
    setProfile({ ...profile, experiences: updated });
  };

  const removeExperienceBullet = (expIndex: number, bulletIndex: number) => {
    const updated = [...profile.experiences];
    updated[expIndex].bullet_points.splice(bulletIndex, 1);
    setProfile({ ...profile, experiences: updated });
  };

  // Project Handlers
  const addProject = () => {
    const newProj: Project = {
      name: '',
      description: '',
      tech_stack: '',
      link: '',
    };
    setProfile({ ...profile, projects: [newProj, ...profile.projects] });
  };

  const updateProject = (index: number, field: keyof Project, value: any) => {
    const updated = [...profile.projects];
    updated[index] = { ...updated[index], [field]: value };
    setProfile({ ...profile, projects: updated });
  };

  const removeProject = (index: number) => {
    const updated = [...profile.projects];
    updated.splice(index, 1);
    setProfile({ ...profile, projects: updated });
  };

  // Certification Handlers
  const addCertification = () => {
    const newCert: Certification = {
      name: '',
      issuer: '',
      date_earned: '',
    };
    setProfile({ ...profile, certifications: [newCert, ...profile.certifications] });
  };

  const updateCertification = (index: number, field: keyof Certification, value: any) => {
    const updated = [...profile.certifications];
    updated[index] = { ...updated[index], [field]: value };
    setProfile({ ...profile, certifications: updated });
  };

  const removeCertification = (index: number) => {
    const updated = [...profile.certifications];
    updated.splice(index, 1);
    setProfile({ ...profile, certifications: updated });
  };

  // Education Handlers
  const addEducation = () => {
    const newEdu: Education = {
      institution: '',
      degree: '',
      field: '',
      graduation_year: '',
    };
    setProfile({ ...profile, education: [newEdu, ...profile.education] });
  };

  const updateEducation = (index: number, field: keyof Education, value: any) => {
    const updated = [...profile.education];
    updated[index] = { ...updated[index], [field]: value };
    setProfile({ ...profile, education: updated });
  };

  const removeEducation = (index: number) => {
    const updated = [...profile.education];
    updated.splice(index, 1);
    setProfile({ ...profile, education: updated });
  };

  const copyExtractedText = () => {
    if (extractedText) {
      navigator.clipboard.writeText(extractedText);
      setCopiedRaw(true);
      setTimeout(() => setCopiedRaw(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
        <p className="mt-3 text-sm text-slate-500 font-medium">Loading candidate profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center space-x-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all animate-bounce ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-emerald-500/10'
              : 'bg-rose-50 text-rose-800 border-rose-200 shadow-rose-500/10'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Page Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Candidate Profile
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Build your master profile or auto-fill directly from your resume. The AI will use these facts for your applications.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <label
            className={`flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 active:from-sky-800 active:to-indigo-800 text-white text-sm font-semibold rounded-lg shadow-sm shadow-sky-600/20 cursor-pointer transition ${
              parsingCv ? 'opacity-70 pointer-events-none' : ''
            }`}
          >
            {parsingCv ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>AI Parsing Resume...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>AI Auto-Fill from CV (.pdf/.docx)</span>
              </>
            )}
            <input
              type="file"
              accept=".pdf,.docx"
              onChange={handleFileUpload}
              disabled={parsingCv}
              className="hidden"
            />
          </label>

          {extractedText && (
            <button
              type="button"
              onClick={() => setShowExtractedModal(true)}
              className="flex items-center space-x-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg shadow-xs transition"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>View Raw Text</span>
            </button>
          )}

          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="flex items-center space-x-2 px-5 py-2 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-sm font-semibold rounded-lg shadow-sm transition"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'Saving...' : 'Save Profile'}</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="mt-8 space-y-8">
        {/* Personal Details */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center space-x-2 pb-4 border-b border-slate-100">
            <User className="w-5 h-5 text-sky-600" />
            <span>Personal Information</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                placeholder="e.g. Alex Morgan"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  placeholder="alex.morgan@example.com"
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="+1 (555) 234-5678"
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Location
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={profile.location}
                  onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                  placeholder="San Francisco, CA (or Remote)"
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                LinkedIn Profile URL
              </label>
              <div className="relative">
                <Link2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="url"
                  value={profile.linkedin || ''}
                  onChange={(e) => setProfile({ ...profile, linkedin: e.target.value })}
                  placeholder="https://linkedin.com/in/alexmorgan"
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Portfolio / GitHub / Website URL
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="url"
                  value={profile.portfolio_url || ''}
                  onChange={(e) => setProfile({ ...profile, portfolio_url: e.target.value })}
                  placeholder="https://alexmorgan.dev"
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Summary & Skills */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 flex items-center space-x-2 pb-3 border-b border-slate-100">
              <FileText className="w-5 h-5 text-sky-600" />
              <span>Professional Summary</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1 mb-2">
              High-level overview of your background, experience level, and key strengths.
            </p>
            <textarea
              rows={4}
              value={profile.summary}
              onChange={(e) => setProfile({ ...profile, summary: e.target.value })}
              placeholder="Seasoned Software Engineer with 6+ years building scalable microservices, web platforms, and cloud infrastructure..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
            />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-slate-900 flex items-center space-x-2 pb-3 border-b border-slate-100">
              <Award className="w-5 h-5 text-sky-600" />
              <span>Core Skills</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1 mb-2">
              Add technical skills, tools, frameworks, and domains (e.g., Python, React, AWS, Docker). You can also add more skills manually below.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSkill();
                  }
                }}
                placeholder="Type a skill and press Enter (or comma-separated)"
                className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
              />
              <button
                type="button"
                onClick={addSkill}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg transition"
              >
                Add Skill
              </button>
            </div>

            {profile.skills.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
                {profile.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center space-x-1.5 px-3 py-1 bg-sky-50 border border-sky-100 text-sky-800 text-xs font-medium rounded-full"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => removeSkill(index)}
                      className="text-sky-400 hover:text-sky-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Work Experience */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 flex items-center space-x-2">
                <Briefcase className="w-5 h-5 text-sky-600" />
                <span>Work Experience</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                List your employment history with measurable achievements and impact.
              </p>
            </div>
            <button
              type="button"
              onClick={addExperience}
              className="flex items-center space-x-1 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold rounded-lg transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Experience</span>
            </button>
          </div>

          {profile.experiences.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              No work experiences added yet. Click &quot;Add Experience&quot; above to create one manually or use &quot;AI Auto-Fill from CV&quot;.
            </div>
          ) : (
            <div className="mt-4 space-y-6">
              {profile.experiences.map((exp, expIdx) => (
                <div
                  key={expIdx}
                  className="p-5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-4 relative group"
                >
                  <button
                    type="button"
                    onClick={() => removeExperience(expIdx)}
                    title="Delete Experience"
                    className="absolute top-4 right-4 text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pr-8">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Company *</label>
                      <input
                        type="text"
                        value={exp.company}
                        onChange={(e) => updateExperience(expIdx, 'company', e.target.value)}
                        placeholder="e.g. Acme Corp"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Job Title *</label>
                      <input
                        type="text"
                        value={exp.title}
                        onChange={(e) => updateExperience(expIdx, 'title', e.target.value)}
                        placeholder="e.g. Senior Software Engineer"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Start Date</label>
                      <input
                        type="text"
                        value={exp.start_date}
                        onChange={(e) => updateExperience(expIdx, 'start_date', e.target.value)}
                        placeholder="e.g. Mar 2021"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">End Date</label>
                      <input
                        type="text"
                        value={exp.end_date || ''}
                        onChange={(e) => updateExperience(expIdx, 'end_date', e.target.value)}
                        placeholder="e.g. Present"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-semibold text-slate-600">
                        Bullet Points / Key Accomplishments
                      </label>
                      <button
                        type="button"
                        onClick={() => addExperienceBullet(expIdx)}
                        className="text-xs text-sky-600 hover:text-sky-800 font-medium flex items-center space-x-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Bullet</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {exp.bullet_points.map((bullet, bulletIdx) => (
                        <div key={bulletIdx} className="flex items-start space-x-2">
                          <span className="text-slate-400 mt-2 text-xs">•</span>
                          <textarea
                            rows={2}
                            value={bullet}
                            onChange={(e) =>
                              updateExperienceBullet(expIdx, bulletIdx, e.target.value)
                            }
                            placeholder="Spearheaded migration to microservices, reducing API latency by 35%..."
                            className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                          />
                          {exp.bullet_points.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeExperienceBullet(expIdx, bulletIdx)}
                              className="text-slate-400 hover:text-rose-500 p-1 mt-1"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Projects */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 flex items-center space-x-2">
                <FolderGit2 className="w-5 h-5 text-sky-600" />
                <span>Featured Projects</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Highlight notable open source, side, or enterprise projects. Add more projects anytime.
              </p>
            </div>
            <button
              type="button"
              onClick={addProject}
              className="flex items-center space-x-1 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold rounded-lg transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Project</span>
            </button>
          </div>

          {profile.projects.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-sm">
              No projects added yet. Click &quot;Add Project&quot; above to create one.
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {profile.projects.map((proj, projIdx) => (
                <div
                  key={projIdx}
                  className="p-5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3 relative group"
                >
                  <button
                    type="button"
                    onClick={() => removeProject(projIdx)}
                    title="Delete Project"
                    className="absolute top-4 right-4 text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pr-8">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Project Name *</label>
                      <input
                        type="text"
                        value={proj.name}
                        onChange={(e) => updateProject(projIdx, 'name', e.target.value)}
                        placeholder="e.g. Distributed Task Queue"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-sky-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Tech Stack</label>
                      <input
                        type="text"
                        value={proj.tech_stack}
                        onChange={(e) => updateProject(projIdx, 'tech_stack', e.target.value)}
                        placeholder="e.g. Python, Redis, FastAPI, Docker"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Link / Demo</label>
                      <input
                        type="url"
                        value={proj.link || ''}
                        onChange={(e) => updateProject(projIdx, 'link', e.target.value)}
                        placeholder="https://github.com/example/queue"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={proj.description}
                      onChange={(e) => updateProject(projIdx, 'description', e.target.value)}
                      placeholder="High-throughput distributed asynchronous worker queue handling 10k+ tasks/sec..."
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Certifications & Education Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Certifications */}
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900 flex items-center space-x-2">
                <Award className="w-4 h-4 text-sky-600" />
                <span>Certifications</span>
              </h2>
              <button
                type="button"
                onClick={addCertification}
                className="flex items-center space-x-1 px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-medium rounded-lg transition"
              >
                <Plus className="w-3 h-3" />
                <span>Add</span>
              </button>
            </div>

            {profile.certifications.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                No certifications added yet.
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                {profile.certifications.map((cert, certIdx) => (
                  <div
                    key={certIdx}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 relative group"
                  >
                    <button
                      type="button"
                      onClick={() => removeCertification(certIdx)}
                      className="absolute top-2 right-2 text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="text"
                      value={cert.name}
                      onChange={(e) => updateCertification(certIdx, 'name', e.target.value)}
                      placeholder="Certification Name (e.g. AWS Solutions Architect)"
                      className="w-full pr-6 px-2.5 py-1 bg-white border border-slate-200 rounded text-xs focus:ring-1 focus:ring-sky-500"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={cert.issuer}
                        onChange={(e) => updateCertification(certIdx, 'issuer', e.target.value)}
                        placeholder="Issuer (e.g. Amazon Web Services)"
                        className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded text-xs focus:ring-1 focus:ring-sky-500"
                      />
                      <input
                        type="text"
                        value={cert.date_earned || ''}
                        onChange={(e) => updateCertification(certIdx, 'date_earned', e.target.value)}
                        placeholder="Date (e.g. 2023)"
                        className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded text-xs focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Education */}
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900 flex items-center space-x-2">
                <GraduationCap className="w-4 h-4 text-sky-600" />
                <span>Education</span>
              </h2>
              <button
                type="button"
                onClick={addEducation}
                className="flex items-center space-x-1 px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-medium rounded-lg transition"
              >
                <Plus className="w-3 h-3" />
                <span>Add</span>
              </button>
            </div>

            {profile.education.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                No education details added yet.
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                {profile.education.map((edu, eduIdx) => (
                  <div
                    key={eduIdx}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 relative group"
                  >
                    <button
                      type="button"
                      onClick={() => removeEducation(eduIdx)}
                      className="absolute top-2 right-2 text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="text"
                      value={edu.institution}
                      onChange={(e) => updateEducation(eduIdx, 'institution', e.target.value)}
                      placeholder="University / Institution"
                      className="w-full pr-6 px-2.5 py-1 bg-white border border-slate-200 rounded text-xs focus:ring-1 focus:ring-sky-500"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={edu.degree}
                        onChange={(e) => updateEducation(eduIdx, 'degree', e.target.value)}
                        placeholder="Degree (e.g. B.S.)"
                        className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded text-xs focus:ring-1 focus:ring-sky-500"
                      />
                      <input
                        type="text"
                        value={edu.field || ''}
                        onChange={(e) => updateEducation(eduIdx, 'field', e.target.value)}
                        placeholder="Field (e.g. CS)"
                        className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded text-xs focus:ring-1 focus:ring-sky-500"
                      />
                      <input
                        type="text"
                        value={edu.graduation_year || ''}
                        onChange={(e) => updateEducation(eduIdx, 'graduation_year', e.target.value)}
                        placeholder="Grad Year"
                        className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded text-xs focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Bottom Save Bar */}
        <div className="sticky bottom-4 z-30 p-4 bg-slate-900/90 backdrop-blur-md text-white rounded-2xl shadow-xl flex items-center justify-between">
          <div className="text-xs text-slate-300">
            Remember to save your profile changes before generating applications.
          </div>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2 px-6 py-2.5 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-white text-sm font-semibold rounded-xl shadow-lg transition"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'Saving...' : 'Save Profile'}</span>
          </button>
        </div>
      </form>

      {/* Extracted Text Modal / Side Panel */}
      {showExtractedModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-sky-600" />
                <h3 className="font-bold text-slate-900">Extracted CV Text</h3>
              </div>
              <button
                onClick={() => setShowExtractedModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-amber-50 border-b border-amber-200/60 text-xs text-amber-800 flex items-center justify-between">
              <span>
                Raw extracted text from your resume document.
              </span>
              <button
                onClick={copyExtractedText}
                className="flex items-center space-x-1 px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded font-medium transition"
              >
                {copiedRaw ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedRaw ? 'Copied' : 'Copy All'}</span>
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 font-mono text-xs text-slate-800 bg-slate-50 whitespace-pre-wrap select-all">
              {extractedText}
            </div>

            <div className="p-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowExtractedModal(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
