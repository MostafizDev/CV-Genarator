import type { TemplateKind } from '../types';

// Which custom (or built-in) template a user wants used by default for each kind of
// export. Stored client-side rather than as a backend column, consistent with how
// session/auth state is also cached client-side today -- this is a single-user-per-
// account app, so cross-device sync isn't a current requirement.
const STORAGE_KEYS: Record<TemplateKind, string> = {
  cv: 'cv_generator_template_cv',
  cover_letter: 'cv_generator_template_cover_letter',
};

export function getDefaultTemplateId(kind: TemplateKind): number | null {
  const raw = localStorage.getItem(STORAGE_KEYS[kind]);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function setDefaultTemplateId(kind: TemplateKind, id: number | null) {
  if (id === null) {
    localStorage.removeItem(STORAGE_KEYS[kind]);
  } else {
    localStorage.setItem(STORAGE_KEYS[kind], String(id));
  }
}
