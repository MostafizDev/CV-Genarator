import React, { useState } from 'react';
import { Sparkles, Copy, Check, Download, Loader2 } from 'lucide-react';

interface CoverLetterPreviewPanelProps {
  value: string;
  onChange: (value: string) => void;
  onExport: () => void;
  exporting: boolean;
  title?: string;
}

export const CoverLetterPreviewPanel: React.FC<CoverLetterPreviewPanelProps> = ({
  value,
  onChange,
  onExport,
  exporting,
  title = 'Tailored Cover Letter',
}) => {
  const [copied, setCopied] = useState(false);

  const copyText = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="flex items-center justify-between p-4 bg-slate-900 text-white">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="font-semibold text-sm">{title}</span>
        </div>

        <button
          type="button"
          onClick={copyText}
          className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition border border-slate-700"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy Cover Letter'}</span>
        </button>
      </div>

      <div className="p-6 max-h-[500px] overflow-y-auto">
        <textarea
          rows={16}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-xs sm:text-sm leading-relaxed text-slate-700 whitespace-pre-wrap font-serif bg-slate-50/50 p-6 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
        />
      </div>

      <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <span className="text-[11px] text-slate-400">Edits here are included when you export.</span>
        <button
          type="button"
          onClick={onExport}
          disabled={exporting || !value.trim()}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          <span>{exporting ? 'Exporting...' : 'Export PDF'}</span>
        </button>
      </div>
    </div>
  );
};
