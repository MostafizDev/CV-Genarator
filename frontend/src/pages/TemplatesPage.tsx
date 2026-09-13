import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  LayoutTemplate,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Check,
} from 'lucide-react';
import type { Template, TemplateKind } from '../types';
import { getTemplates, createTemplate, deleteTemplate, previewTemplate } from '../api/client';
import { getDefaultTemplateId, setDefaultTemplateId } from '../utils/templatePrefs';

const KIND_LABELS: Record<TemplateKind, string> = {
  cv: 'CV Templates',
  cover_letter: 'Cover Letter Templates',
};

const KIND_PLACEHOLDER: Record<TemplateKind, string> = {
  cv: '<html>\n  <body>\n    <h1>{{ cv.full_name }}</h1>\n    <p>{{ cv.summary }}</p>\n  </body>\n</html>',
  cover_letter: '<html>\n  <body>\n    <div style="white-space: pre-wrap">{{ text }}</div>\n  </body>\n</html>',
};

// A "page" is scaled down proportionally to whatever width the card gives it, so the
// preview always keeps a realistic 8.5x11 aspect ratio regardless of screen size.
const PAGE_WIDTH = 850;
const PAGE_HEIGHT = 1100;

const ScaledPreview: React.FC<{ html: string | null; loading?: boolean }> = ({ html, loading }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.2);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setScale(el.offsetWidth / PAGE_WIDTH);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden bg-white rounded-lg border border-slate-200"
      style={{ aspectRatio: `${PAGE_WIDTH} / ${PAGE_HEIGHT}` }}
    >
      {loading || !html ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-slate-300 animate-spin" />
        </div>
      ) : (
        <iframe
          title="Template preview"
          srcDoc={html}
          sandbox=""
          style={{
            width: PAGE_WIDTH,
            height: PAGE_HEIGHT,
            border: 'none',
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
};

interface TemplateCardProps {
  template: Template;
  previewHtml: string | null;
  loadingPreview: boolean;
  selected: boolean;
  onSelect: () => void;
  onDelete?: () => void;
  deleting?: boolean;
}

const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  previewHtml,
  loadingPreview,
  selected,
  onSelect,
  onDelete,
  deleting,
}) => (
  <div
    className={`rounded-2xl border p-3 space-y-2.5 transition ${
      selected ? 'border-sky-400 ring-2 ring-sky-100 bg-sky-50/40' : 'border-slate-200 bg-white'
    }`}
  >
    <ScaledPreview html={previewHtml} loading={loadingPreview} />
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-900 truncate">{template.name}</div>
        <div className="flex items-center space-x-1.5 mt-0.5">
          {!template.is_custom ? (
            <span className="flex items-center space-x-1 text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-medium">
              <ShieldCheck className="w-2.5 h-2.5" />
              <span>Built-in</span>
            </span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-full font-medium">
              Yours
            </span>
          )}
        </div>
      </div>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition disabled:opacity-50"
          title="Delete template"
        >
          {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
    <button
      type="button"
      onClick={onSelect}
      className={`w-full flex items-center justify-center space-x-1.5 py-1.5 rounded-lg text-xs font-semibold transition ${
        selected
          ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/20'
          : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
      }`}
    >
      {selected && <Check className="w-3.5 h-3.5" />}
      <span>{selected ? 'Selected as default' : 'Use this template'}</span>
    </button>
  </div>
);

export const TemplatesPage: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [previews, setPreviews] = useState<Record<number, string>>({});
  const [previewingIds, setPreviewingIds] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [defaultIds, setDefaultIds] = useState<Record<TemplateKind, number | null>>({
    cv: getDefaultTemplateId('cv'),
    cover_letter: getDefaultTemplateId('cover_letter'),
  });

  const [name, setName] = useState('');
  const [kind, setKind] = useState<TemplateKind>('cv');
  const [html, setHtml] = useState('');
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [draftPreviewHtml, setDraftPreviewHtml] = useState<string | null>(null);
  const [draftPreviewLoading, setDraftPreviewLoading] = useState(false);
  const [draftPreviewError, setDraftPreviewError] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const list = await getTemplates();
      setTemplates(list);

      setPreviewingIds(new Set(list.map((t) => t.id)));
      const entries = await Promise.all(
        list.map(async (t) => {
          try {
            const rendered = await previewTemplate(t.kind, t.template_html);
            return [t.id, rendered] as const;
          } catch {
            return [t.id, null] as const;
          }
        })
      );
      const map: Record<number, string> = {};
      for (const [id, rendered] of entries) if (rendered) map[id] = rendered;
      setPreviews(map);
      setPreviewingIds(new Set());
    } catch (err: any) {
      showToast(err.message || 'Failed to load templates', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Live preview of the template currently being drafted in the create form, debounced
  // so we're not hitting the backend on every keystroke.
  useEffect(() => {
    if (!html.trim()) {
      setDraftPreviewHtml(null);
      setDraftPreviewError(null);
      return;
    }
    setDraftPreviewLoading(true);
    setDraftPreviewError(null);
    const timeout = setTimeout(async () => {
      try {
        const rendered = await previewTemplate(kind, html);
        setDraftPreviewHtml(rendered);
      } catch (err: any) {
        setDraftPreviewHtml(null);
        setDraftPreviewError(err.message || 'Failed to render preview');
      } finally {
        setDraftPreviewLoading(false);
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [kind, html]);

  const handleSelect = (t: Template) => {
    setDefaultTemplateId(t.kind, t.id);
    setDefaultIds((prev) => ({ ...prev, [t.kind]: t.id }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !html.trim()) {
      showToast('Give the template a name and some content.', 'error');
      return;
    }
    try {
      setCreating(true);
      await createTemplate({ name: name.trim(), kind, template_html: html });
      setName('');
      setHtml('');
      setDraftPreviewHtml(null);
      await loadTemplates();
      showToast('Template created.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to create template', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this template? This cannot be undone.')) return;
    try {
      setDeletingId(id);
      await deleteTemplate(id);
      await loadTemplates();
      showToast('Template deleted.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete template', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
        <p className="mt-3 text-sm text-slate-500 font-medium">Loading templates...</p>
      </div>
    );
  }

  const byKind = (k: TemplateKind) => templates.filter((t) => t.kind === k);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center space-x-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
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

      <div className="pb-6 border-b border-slate-200">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
          <LayoutTemplate className="w-7 h-7 text-sky-600" />
          <span>Templates</span>
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Pick a default CV and cover letter template for your exports, or create your own.
          Previews show sample data, not your real profile.
        </p>
      </div>

      {(['cv', 'cover_letter'] as TemplateKind[]).map((k) => (
        <div key={k} className="mt-8">
          <h2 className="text-base font-semibold text-slate-900 mb-3">{KIND_LABELS[k]}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {byKind(k).map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                previewHtml={previews[t.id] || null}
                loadingPreview={previewingIds.has(t.id)}
                selected={defaultIds[k] === t.id}
                onSelect={() => handleSelect(t)}
                onDelete={t.is_custom ? () => handleDelete(t.id) : undefined}
                deleting={deletingId === t.id}
              />
            ))}
          </div>
        </div>
      ))}

      <div className="mt-10 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-base font-semibold text-slate-900">Create a Custom Template</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Minimal Two-Column"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Type
                </label>
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value as TemplateKind)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
                >
                  <option value="cv">CV</option>
                  <option value="cover_letter">Cover Letter</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Template HTML/CSS
              </label>
              <p className="text-xs text-slate-500 mb-1.5">
                A CV template can reference{' '}
                <code className="font-mono bg-slate-100 px-1 rounded">cv</code> (full_name, email,
                phone, location, linkedin, portfolio_url, summary, skills, experience, projects,
                certifications, education). A cover letter template can reference{' '}
                <code className="font-mono bg-slate-100 px-1 rounded">text</code>.
              </p>
              <textarea
                rows={14}
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                placeholder={KIND_PLACEHOLDER[kind]}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={creating}
              className="flex items-center space-x-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white text-sm font-semibold rounded-lg shadow-sm shadow-sky-600/20 transition disabled:opacity-60"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>{creating ? 'Creating...' : 'Create Template'}</span>
            </button>
          </form>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Live Preview
            </label>
            {draftPreviewError ? (
              <div className="flex items-start space-x-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{draftPreviewError}</span>
              </div>
            ) : (
              <div className="max-w-xs">
                <ScaledPreview html={draftPreviewHtml} loading={draftPreviewLoading} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
