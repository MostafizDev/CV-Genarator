import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Key,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Cpu,
  Save,
  Loader2,
  ShieldCheck,
  ExternalLink,
  RefreshCw,
  Star,
  PlugZap,
  LayoutTemplate,
} from 'lucide-react';
import type { ProviderSetting, Template, TemplateKind } from '../types';
import { getSettings, saveSetting, testProviderConnection, getTemplates } from '../api/client';
import { getDefaultTemplateId, setDefaultTemplateId } from '../utils/templatePrefs';

const TEMPLATE_KINDS: { id: TemplateKind; label: string }[] = [
  { id: 'cv', label: 'CV Template' },
  { id: 'cover_letter', label: 'Cover Letter Template' },
];

interface ProviderMeta {
  id: string;
  label: string;
  keyPlaceholder: string;
  modelPlaceholder: string;
  presets: string[];
  docsUrl?: string;
  docsLabel?: string;
}

const PROVIDER_META: ProviderMeta[] = [
  {
    id: 'groq',
    label: 'Groq',
    keyPlaceholder: 'gsk_...',
    modelPlaceholder: 'openai/gpt-oss-120b',
    presets: ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.6-27b', 'groq/compound-mini'],
    docsUrl: 'https://console.groq.com/keys',
    docsLabel: 'console.groq.com/keys',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    keyPlaceholder: 'sk-proj-...',
    modelPlaceholder: 'gpt-4o-mini',
    presets: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo', 'o3-mini'],
    docsUrl: 'https://platform.openai.com/api-keys',
    docsLabel: 'platform.openai.com/api-keys',
  },
  {
    id: 'anthropic',
    label: 'Anthropic Claude',
    keyPlaceholder: 'sk-ant-...',
    modelPlaceholder: 'claude-sonnet-5',
    presets: ['claude-sonnet-5', 'claude-opus-5', 'claude-haiku-4-5-20251001'],
    docsUrl: 'https://console.anthropic.com/settings/keys',
    docsLabel: 'console.anthropic.com',
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    keyPlaceholder: 'AIza...',
    modelPlaceholder: 'gemini-1.5-flash',
    presets: ['gemini-1.5-flash', 'gemini-1.5-pro'],
    docsUrl: 'https://aistudio.google.com/apikey',
    docsLabel: 'aistudio.google.com',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    keyPlaceholder: 'sk-...',
    modelPlaceholder: 'deepseek-chat',
    presets: ['deepseek-chat', 'deepseek-reasoner'],
    docsUrl: 'https://platform.deepseek.com/api_keys',
    docsLabel: 'platform.deepseek.com',
  },
];

interface CardFormState {
  apiKey: string;
  model: string;
}

type TestResult = { success: boolean; message: string } | null;

export const SettingsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [savedSettings, setSavedSettings] = useState<ProviderSetting[]>([]);
  const [formState, setFormState] = useState<Record<string, CardFormState>>({});
  const [defaultProvider, setDefaultProvider] = useState<string>('groq');
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [defaultTemplateIds, setDefaultTemplateIds] = useState<Record<TemplateKind, number | null>>({
    cv: null,
    cover_letter: null,
  });

  useEffect(() => {
    (async () => {
      try {
        const list = await getTemplates();
        setTemplates(list);
      } catch {
        // Non-fatal: the default-template picker just won't have options to show
      }
    })();
    setDefaultTemplateIds({
      cv: getDefaultTemplateId('cv'),
      cover_letter: getDefaultTemplateId('cover_letter'),
    });
  }, []);

  const handleSelectTemplate = (kind: TemplateKind, id: number | null) => {
    setDefaultTemplateId(kind, id);
    setDefaultTemplateIds((prev) => ({ ...prev, [kind]: id }));
  };

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const settings = await getSettings();
      setSavedSettings(settings);

      const nextForm: Record<string, CardFormState> = {};
      for (const meta of PROVIDER_META) {
        const saved = settings.find((s) => s.provider === meta.id);
        nextForm[meta.id] = {
          apiKey: saved?.api_key || '',
          model: saved?.model || meta.modelPlaceholder,
        };
      }
      setFormState(nextForm);

      const defaultSetting = settings.find((s) => s.is_default);
      if (defaultSetting) setDefaultProvider(defaultSetting.provider);
    } catch (err: any) {
      showToast(err.message || 'Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const updateForm = (providerId: string, field: keyof CardFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [providerId]: { ...prev[providerId], [field]: value } }));
    setTestResults((prev) => ({ ...prev, [providerId]: null }));
  };

  const handleSave = async (providerId: string) => {
    const form = formState[providerId];
    if (!form?.apiKey.trim()) {
      showToast(`Enter an API key for ${providerId} before saving.`, 'error');
      return;
    }

    try {
      setSaving((prev) => ({ ...prev, [providerId]: true }));
      await saveSetting({
        provider: providerId,
        api_key: form.apiKey.trim(),
        model: form.model.trim(),
        is_default: defaultProvider === providerId,
      });
      await loadSettings();
      showToast(`${providerId.toUpperCase()} settings saved.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setSaving((prev) => ({ ...prev, [providerId]: false }));
    }
  };

  const handleTest = async (providerId: string) => {
    const form = formState[providerId];
    try {
      setTesting((prev) => ({ ...prev, [providerId]: true }));
      setTestResults((prev) => ({ ...prev, [providerId]: null }));
      const result = await testProviderConnection(providerId, form?.apiKey, form?.model);
      setTestResults((prev) => ({ ...prev, [providerId]: result }));
    } catch (err: any) {
      setTestResults((prev) => ({ ...prev, [providerId]: { success: false, message: err.message || 'Test failed' } }));
    } finally {
      setTesting((prev) => ({ ...prev, [providerId]: false }));
    }
  };

  const activeProviderSetting = savedSettings.find((s) => s.is_default) || savedSettings[0];
  const hasConfiguredKey = activeProviderSetting && activeProviderSetting.api_key?.trim().length > 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="mt-3 text-sm text-slate-500 font-medium">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center space-x-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all ${
            toast.type === 'success'
              ? 'bg-green-100 text-green-800 border-green-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="pb-6 border-b border-slate-200">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">AI Provider Settings</h1>
        <p className="text-slate-500 text-sm mt-1">
          Configure credentials for any of five providers. Mark one as default, or override it per-generation.
        </p>
      </div>

      {/* Status banner */}
      <div
        className={`mt-6 p-4 rounded-xl border flex items-start space-x-3 ${
          hasConfiguredKey
            ? 'bg-green-100/70 border-green-200 text-green-900'
            : 'bg-amber-50/70 border-amber-200 text-amber-900'
        }`}
      >
        {hasConfiguredKey ? (
          <ShieldCheck className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
        ) : (
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        )}
        <div className="text-xs sm:text-sm">
          <div className="font-semibold">
            {hasConfiguredKey ? 'AI Provider Active & Ready' : 'API Key Required'}
          </div>
          <div className="text-xs mt-0.5 opacity-90">
            {hasConfiguredKey
              ? `Default provider: ${activeProviderSetting.provider.toUpperCase()} (${activeProviderSetting.model})`
              : 'Configure at least one provider below to unlock tailored CV generation.'}
          </div>
        </div>
      </div>

      {/* Provider Cards */}
      <div className="mt-6 space-y-5">
        {PROVIDER_META.map((meta) => {
          const form = formState[meta.id] || { apiKey: '', model: meta.modelPlaceholder };
          const isSaved = savedSettings.some((s) => s.provider === meta.id && s.api_key);
          const result = testResults[meta.id];

          return (
            <div key={meta.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center space-x-2.5">
                  <h2 className="text-base font-semibold text-slate-900">{meta.label}</h2>
                  {isSaved && (
                    <span className="text-[11px] px-2 py-0.5 bg-green-100 text-green-700 border border-green-200 rounded-full font-medium">
                      Configured
                    </span>
                  )}
                  {defaultProvider === meta.id && (
                    <span className="flex items-center space-x-1 text-[11px] px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full font-medium">
                      <Star className="w-3 h-3 fill-current" />
                      <span>Default</span>
                    </span>
                  )}
                </div>

                <label className="flex items-center space-x-1.5 text-xs font-medium text-slate-600 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="default-provider"
                    checked={defaultProvider === meta.id}
                    onChange={() => setDefaultProvider(meta.id)}
                    className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Set as default</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">API Key</label>
                    {meta.docsUrl && (
                      <a
                        href={meta.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1"
                      >
                        <span>{meta.docsLabel}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <div className="relative">
                    <Key className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type={showKey[meta.id] ? 'text' : 'password'}
                      value={form.apiKey}
                      onChange={(e) => updateForm(meta.id, 'apiKey', e.target.value)}
                      placeholder={meta.keyPlaceholder}
                      className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey((prev) => ({ ...prev, [meta.id]: !prev[meta.id] }))}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      {showKey[meta.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Model Name
                  </label>
                  <div className="relative">
                    <Cpu className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={form.model}
                      onChange={(e) => updateForm(meta.id, 'model', e.target.value)}
                      placeholder={meta.modelPlaceholder}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {meta.presets.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => updateForm(meta.id, 'model', p)}
                    className={`text-[11px] px-2 py-1 rounded-md border font-mono transition ${
                      form.model === p
                        ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {result && (
                <div
                  className={`flex items-start space-x-2 p-2.5 rounded-lg border text-xs ${
                    result.success
                      ? 'bg-green-100 border-green-200 text-green-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  {result.success ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  )}
                  <span className="break-all">{result.message}</span>
                </div>
              )}

              <div className="pt-1 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => handleTest(meta.id)}
                  disabled={testing[meta.id] || !form.apiKey.trim()}
                  className="flex items-center space-x-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {testing[meta.id] ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <PlugZap className="w-3.5 h-3.5" />
                  )}
                  <span>{testing[meta.id] ? 'Testing...' : 'Test Connection'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSave(meta.id)}
                  disabled={saving[meta.id]}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-sm shadow-blue-600/20 transition disabled:opacity-60"
                >
                  {saving[meta.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{saving[meta.id] ? 'Saving...' : 'Save'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Default Template Picker */}
      <div className="mt-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-base font-semibold text-slate-900 flex items-center space-x-2">
            <LayoutTemplate className="w-4 h-4 text-blue-600" />
            <span>Default Templates</span>
          </h2>
          <Link to="/templates" className="text-xs text-blue-600 hover:text-blue-800 font-medium">
            Manage templates
          </Link>
        </div>
        <p className="text-xs text-slate-500">
          Choose which template each PDF export uses by default. Leave unset to use the built-in template.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TEMPLATE_KINDS.map(({ id: kind, label }) => {
            const options = templates.filter((t) => t.kind === kind);
            return (
              <div key={kind}>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  {label}
                </label>
                <select
                  value={defaultTemplateIds[kind] ?? ''}
                  onChange={(e) =>
                    handleSelectTemplate(kind, e.target.value ? Number(e.target.value) : null)
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                >
                  <option value="">Built-in (default)</option>
                  {options.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {!t.is_custom ? ' (built-in)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
