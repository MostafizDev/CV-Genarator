import React from 'react';
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import type { FilenameField } from '../../types';
import { ALL_FILENAME_FIELDS, FILENAME_FIELD_LABELS } from '../../utils/pdfFilename';

interface FilenameFieldOrderProps {
  value: FilenameField[];
  onChange: (next: FilenameField[]) => void;
  disabled?: boolean;
}

function swap<T>(list: T[], i: number, j: number): T[] {
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/** Pick which fields make up an exported PDF's filename, and reorder the ones picked. */
export const FilenameFieldOrder: React.FC<FilenameFieldOrderProps> = ({ value, onChange, disabled }) => {
  const unselected = ALL_FILENAME_FIELDS.filter((field) => !value.includes(field));

  return (
    <div className="space-y-2.5">
      {value.length === 0 && (
        <p className="text-xs text-slate-400 italic">No fields selected -- the company name will be used.</p>
      )}

      <ol className="space-y-1.5">
        {value.map((field, index) => (
          <li
            key={field}
            className="flex items-center space-x-2.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
          >
            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-blue-600 text-white text-[11px] font-semibold shrink-0">
              {index + 1}
            </span>
            <span className="flex-1 text-sm text-slate-800">{FILENAME_FIELD_LABELS[field]}</span>
            <button
              type="button"
              disabled={disabled || index === 0}
              onClick={() => onChange(swap(value, index, index - 1))}
              aria-label={`Move ${FILENAME_FIELD_LABELS[field]} earlier`}
              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={disabled || index === value.length - 1}
              onClick={() => onChange(swap(value, index, index + 1))}
              aria-label={`Move ${FILENAME_FIELD_LABELS[field]} later`}
              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(value.filter((f) => f !== field))}
              aria-label={`Remove ${FILENAME_FIELD_LABELS[field]}`}
              className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <X className="w-4 h-4" />
            </button>
          </li>
        ))}
      </ol>

      {unselected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {unselected.map((field) => (
            <button
              key={field}
              type="button"
              disabled={disabled}
              onClick={() => onChange([...value, field])}
              className="flex items-center space-x-1 text-xs px-2.5 py-1 rounded-full border border-dashed border-slate-300 text-slate-600 hover:border-blue-400 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-3 h-3" />
              <span>{FILENAME_FIELD_LABELS[field]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
