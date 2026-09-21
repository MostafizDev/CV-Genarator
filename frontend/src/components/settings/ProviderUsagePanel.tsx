import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, RefreshCw } from 'lucide-react';
import { getProviderUsage } from '../../api/client';
import type { ProviderUsage, UsageMeter, UsageStatus } from '../../types';

const STATUS_BADGE: Record<UsageStatus, { label: string; classes: string }> = {
  healthy: { label: 'Healthy', classes: 'bg-green-100 text-green-700 border-green-200' },
  low: { label: 'Running low', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
  limited: { label: 'Limit reached', classes: 'bg-red-50 text-red-700 border-red-200' },
  invalid_key: { label: 'Invalid key', classes: 'bg-red-50 text-red-700 border-red-200' },
  error: { label: 'Unavailable', classes: 'bg-red-50 text-red-700 border-red-200' },
  no_key: { label: 'No key', classes: 'bg-slate-100 text-slate-500 border-slate-200' },
};

/** "2m 59s", "1h 5m", "45s" -- for how long until a limit resets. */
function formatDuration(totalSeconds: number): string {
  const seconds = Math.round(totalSeconds);
  if (seconds < 1) return 'moments';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  if (m > 0) return s > 0 && m < 10 ? `${m}m ${s}s` : `${m}m`;
  return `${s}s`;
}

function formatChecked(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  return minutes === 1 ? '1 min ago' : `${minutes} min ago`;
}

const barColor = (fraction: number) =>
  fraction >= 0.5 ? 'bg-green-600' : fraction >= 0.15 ? 'bg-amber-600' : 'bg-red-600';

const Meter = ({ meter }: { meter: UsageMeter }) => {
  const fraction = Math.min(1, Math.max(0, meter.remaining / meter.limit));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="font-semibold text-slate-700">{meter.label}</span>
        <span className="text-slate-500">
          <span className="font-semibold text-slate-900">{meter.remaining.toLocaleString()}</span> of{' '}
          {meter.limit.toLocaleString()} left
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`${meter.label} remaining`}
        aria-valuemin={0}
        aria-valuemax={meter.limit}
        aria-valuenow={meter.remaining}
        className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200"
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor(fraction)}`}
          style={{ width: `${Math.max(fraction * 100, meter.remaining > 0 ? 2 : 0)}%` }}
        />
      </div>
      {meter.resets_in_seconds !== null && (
        <p className="mt-1 text-[11px] text-slate-400">Resets in {formatDuration(meter.resets_in_seconds)}</p>
      )}
    </div>
  );
};

const LoadingBars = () => (
  <div className="space-y-3" role="status" aria-live="polite">
    <p className="text-xs text-slate-500">Checking usage…</p>
    {[0, 1].map((i) => (
      <div key={i} className="animate-pulse space-y-1.5">
        <div className="flex justify-between">
          <div className="h-3 w-28 rounded bg-slate-200" />
          <div className="h-3 w-20 rounded bg-slate-200" />
        </div>
        <div className="h-2 w-full rounded-full bg-slate-200" />
      </div>
    ))}
  </div>
);

interface ProviderUsagePanelProps {
  provider: string;
  /** False until a key is saved -- nothing is fetched then. */
  enabled: boolean;
  /** Change this number to trigger a fresh check (e.g. after saving a new key). */
  refreshToken: number;
}

export const ProviderUsagePanel = ({ provider, enabled, refreshToken }: ProviderUsagePanelProps) => {
  const [usage, setUsage] = useState<ProviderUsage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUsage(await getProviderUsage(provider));
    } catch (err: any) {
      setError(err.message || 'Could not check usage.');
    } finally {
      setLoading(false);
    }
  }, [provider]);

  useEffect(() => {
    if (enabled) load();
    else setUsage(null);
  }, [enabled, refreshToken, load]);

  const badge = usage ? STATUS_BADGE[usage.status] : null;
  const isProblem = usage && (usage.status === 'limited' || usage.status === 'invalid_key' || usage.status === 'error');
  const isWarning = usage?.status === 'low';

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">Usage &amp; limits</h3>
          {badge && !loading && (
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${badge.classes}`}>
              {badge.label}
            </span>
          )}
        </div>
        {enabled && (
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            {usage && !loading && <span>Checked {formatChecked(usage.checked_at)}</span>}
            <button
              type="button"
              onClick={load}
              disabled={loading}
              aria-label={`Refresh ${provider} usage`}
              className="rounded-md p-1 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}
      </div>

      {!enabled && <p className="text-xs text-slate-500">Save an API key to see its usage and limits here.</p>}

      {enabled && loading && !usage && <LoadingBars />}
      {enabled && loading && usage && <p className="text-xs text-slate-500">Refreshing…</p>}

      {enabled && !loading && error && (
        <p className="flex items-start gap-1.5 text-xs text-red-700">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}

      {enabled && !loading && usage && (
        <>
          {usage.meters.map((meter) => (
            <Meter key={meter.id} meter={meter} />
          ))}

          {usage.balance && (
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span className="font-semibold text-slate-700">Account balance</span>
              <span className="text-slate-500">
                <span className="font-semibold text-slate-900">
                  {usage.balance.currency} {usage.balance.total}
                </span>{' '}
                <span className="text-slate-400">
                  (granted {usage.balance.granted} · top-up {usage.balance.topped_up})
                </span>
              </span>
            </div>
          )}

          <p
            className={`flex items-start gap-1.5 text-xs ${
              isProblem ? 'text-red-700' : isWarning ? 'text-amber-700' : 'text-slate-500'
            }`}
          >
            {isProblem || isWarning ? (
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" />
            )}
            <span>{usage.message}</span>
          </p>

          {usage.note && (
            <p className="flex items-start gap-1.5 text-[11px] text-slate-400">
              <Info className="mt-0.5 h-3 w-3 shrink-0" />
              <span>{usage.note}</span>
            </p>
          )}
        </>
      )}
    </div>
  );
};
