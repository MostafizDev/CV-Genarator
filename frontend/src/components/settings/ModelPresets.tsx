import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { getAvailableModels } from '../../api/client';
import type { ModelList } from '../../types';

const COLLAPSED_COUNT = 10;

interface ModelPresetsProps {
  provider: string;
  /** True once a key is saved -- only then can the provider be asked for its models. */
  enabled: boolean;
  /** Change this number to reload the list (e.g. after saving a new key). */
  refreshToken: number;
  /** Shown when the live list isn't available (no key, rejected key, provider down). */
  fallback: string[];
  value: string;
  onSelect: (model: string) => void;
}

/** Clickable model suggestions: the provider's real model list when we can get it. */
export const ModelPresets = ({ provider, enabled, refreshToken, fallback, value, onSelect }: ModelPresetsProps) => {
  const [list, setList] = useState<ModelList | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(
    async (refresh: boolean) => {
      setLoading(true);
      try {
        setList(await getAvailableModels(provider, refresh));
      } catch {
        setList(null); // network trouble: quietly fall back to the built-in suggestions
      } finally {
        setLoading(false);
      }
    },
    [provider],
  );

  useEffect(() => {
    if (enabled) load(false);
    else setList(null);
  }, [enabled, refreshToken, load]);

  const live = list?.status === 'ok' && list.models.length > 0 ? list.models : null;
  const models = live ?? fallback;
  const visible = live && !showAll ? models.slice(0, COLLAPSED_COUNT) : models;
  const hiddenCount = models.length - visible.length;
  const trimmed = value.trim();
  const notOffered = Boolean(live && trimmed && !live.includes(trimmed));

  let caption: string;
  if (loading && !live) caption = 'Loading the models available to your key…';
  else if (live) caption = `${live.length} models available to your key`;
  else if (!enabled) caption = 'Suggested models — save an API key to see the ones available to you';
  else if (list?.status === 'invalid_key') caption = 'Your key was rejected, so these are suggestions';
  else caption = "Couldn't load your models, so these are suggestions";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5">
          {loading && <Loader2 className="h-3 w-3 animate-spin" />}
          {caption}
        </span>
        {enabled && (
          <button
            type="button"
            onClick={() => load(true)}
            disabled={loading}
            aria-label={`Reload ${provider} models`}
            className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {visible.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onSelect(p)}
            className={`text-[11px] px-2 py-1 rounded-md border font-mono transition ${
              value === p
                ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
            }`}
          >
            {p}
          </button>
        ))}
        {(hiddenCount > 0 || (live && showAll && models.length > COLLAPSED_COUNT)) && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="text-[11px] px-2 py-1 rounded-md border border-transparent text-blue-600 hover:text-blue-800 font-medium"
          >
            {showAll ? 'Show fewer' : `+${hiddenCount} more`}
          </button>
        )}
      </div>

      {notOffered && (
        <p className="flex items-start gap-1.5 text-[11px] text-amber-700">
          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
          <span>
            <span className="font-mono">{trimmed}</span> isn&apos;t in the models this key can use — pick one from the list.
          </span>
        </p>
      )}
    </div>
  );
};
