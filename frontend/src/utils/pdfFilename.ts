import type { FilenameField } from '../types';
import { sanitizeForFilename } from './pdfExport';

export const ALL_FILENAME_FIELDS: FilenameField[] = [
  'first_name',
  'last_name',
  'year_of_experience',
  'company',
  'designation',
];

export const FILENAME_FIELD_LABELS: Record<FilenameField, string> = {
  first_name: 'First Name',
  last_name: 'Last Name',
  year_of_experience: 'Years of Experience',
  company: 'Company Name',
  designation: 'Designation',
};

/** Splits a saved "full_name" into first/last the same simple way the backend does for a
 * Google display name: first word is the first name, everything else is the last name. */
function splitName(fullName: string): { first: string; last: string } {
  const trimmed = fullName.trim();
  const spaceIndex = trimmed.indexOf(' ');
  if (spaceIndex === -1) return { first: trimmed, last: '' };
  return { first: trimmed.slice(0, spaceIndex), last: trimmed.slice(spaceIndex + 1).trim() };
}

/** Rough years of experience from a CV's experience dates -- earliest start year to latest
 * end year (an open-ended/"Present" role counts through the current year). Good enough for a
 * filename label; not the precise, overlap-aware calculation the backend's Gap Analysis uses. */
export function estimateYearsOfExperience(
  experiences: Array<{ start_date?: string; end_date?: string | null }> | undefined,
): number {
  if (!experiences?.length) return 0;
  const currentYear = new Date().getFullYear();
  let earliestStart: number | null = null;
  let latestEnd: number | null = null;

  for (const exp of experiences) {
    const startMatch = exp.start_date?.match(/\d{4}/);
    if (!startMatch) continue;
    const startYear = Number(startMatch[0]);
    const endMatch = exp.end_date?.match(/\d{4}/);
    const endYear = endMatch ? Number(endMatch[0]) : currentYear;

    earliestStart = earliestStart === null ? startYear : Math.min(earliestStart, startYear);
    latestEnd = latestEnd === null ? endYear : Math.max(latestEnd, endYear);
  }

  if (earliestStart === null || latestEnd === null) return 0;
  return Math.max(0, latestEnd - earliestStart);
}

export interface FilenameSource {
  fullName?: string;
  company: string;
  designation: string;
  experiences?: Array<{ start_date?: string; end_date?: string | null }>;
}

/** Builds "CV_<...>.pdf" / "CoverLetter_<...>.pdf" from the user's chosen fields and order.
 * An empty/unset list, or a field with nothing to show, falls back to the company name so a
 * download is never left with an empty or generic name. */
export function buildPdfFilename(
  kind: 'CV' | 'CoverLetter',
  fields: FilenameField[] | undefined,
  source: FilenameSource,
): string {
  const { first, last } = splitName(source.fullName || '');
  const valueFor: Record<FilenameField, string> = {
    first_name: first,
    last_name: last,
    year_of_experience: (() => {
      const years = estimateYearsOfExperience(source.experiences);
      return years > 0 ? `${years}Yrs` : '';
    })(),
    company: source.company,
    designation: source.designation,
  };

  const chosenFields: FilenameField[] = fields?.length ? fields : ['company'];
  const parts = chosenFields.map((field) => valueFor[field]).filter((value) => value.trim().length > 0);

  const name = parts.length ? parts.join('_') : source.company;
  return `${kind}_${sanitizeForFilename(name)}.pdf`;
}
