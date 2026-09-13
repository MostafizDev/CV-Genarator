import type {
  Profile,
  ProviderSetting,
  GenerateRequest,
  GenerateResponse,
  ApplicationListItem,
  Application,
  ApplicationUpdate,
  ProviderTestResult,
  CurrentUser,
  Template,
  TemplateKind,
} from '../types';
import { auth } from '../firebase';

// In dev, Vite proxies "/api" to localhost:8000 (see vite.config.ts). In a production
// build (e.g. served from GitHub Pages, separate from the backend), set VITE_API_BASE
// to the deployed backend's full URL, e.g. "https://your-backend.onrender.com/api".
const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const SESSION_CACHE_KEY = 'cv_generator_session';

export const AUTH_REQUIRED_EVENT = 'app-auth-required';

// A display-only cache of the current user, refreshed on each /api/auth/sync call, so
// Navbar can read it synchronously without an async round trip on every render. The
// real credential is always the live Firebase ID token, fetched fresh per-request below.
export function getStoredSession(): CurrentUser | null {
  const raw = localStorage.getItem(SESSION_CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setStoredSession(session: CurrentUser) {
  localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(session));
}

export function clearStoredSession() {
  localStorage.removeItem(SESSION_CACHE_KEY);
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers || {});
  // getIdToken() returns a cached valid token or refreshes it silently if it's close to
  // expiring (Firebase ID tokens expire hourly) -- no manual refresh timer needed.
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (response.status === 401) {
    clearStoredSession();
    window.dispatchEvent(new Event(AUTH_REQUIRED_EVENT));
  }

  return response;
}

async function parseErrorDetail(response: Response, fallback: string): Promise<string> {
  const err = await response.json().catch(() => ({ detail: fallback }));
  return err.detail || fallback;
}

function jsonHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json' };
}

export async function syncSession(): Promise<CurrentUser> {
  const response = await apiFetch('/auth/sync', { method: 'POST' });
  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, 'Failed to sync session'));
  }
  const user: CurrentUser = await response.json();
  setStoredSession(user);
  return user;
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const response = await apiFetch('/auth/me');
  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, 'Not authenticated'));
  }
  return response.json();
}

export async function getProfile(): Promise<Profile> {
  const response = await apiFetch('/profile');
  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, 'Failed to fetch profile'));
  }
  return response.json();
}

export async function saveProfile(profile: Profile): Promise<Profile> {
  const response = await apiFetch('/profile', {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(profile),
  });
  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, 'Failed to save profile'));
  }
  return response.json();
}

export async function uploadCv(file: File): Promise<{ text: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiFetch('/profile/upload-cv', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, 'Failed to upload and extract CV'));
  }

  return response.json();
}

export async function parseCv(file: File): Promise<{ parsed_profile: Profile; raw_text: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiFetch('/profile/parse-cv', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, 'Failed to parse CV with AI'));
  }

  return response.json();
}

export async function getSettings(): Promise<ProviderSetting[]> {
  const response = await apiFetch('/settings');
  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, 'Failed to fetch settings'));
  }
  return response.json();
}

export async function getAvailableModels(provider: string, apiKey?: string): Promise<string[]> {
  const params = new URLSearchParams({ provider });
  if (apiKey) params.append('api_key', apiKey);
  const response = await apiFetch(`/settings/models?${params.toString()}`);
  if (!response.ok) {
    return [];
  }
  const data = await response.json();
  return data.models || [];
}

export async function saveSetting(setting: Omit<ProviderSetting, 'id'>): Promise<ProviderSetting> {
  const response = await apiFetch('/settings', {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(setting),
  });
  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, 'Failed to save setting'));
  }
  return response.json();
}

export async function generateCvAndCoverLetter(data: GenerateRequest): Promise<GenerateResponse> {
  const response = await apiFetch('/generate', {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, 'Generation failed'));
  }

  return response.json();
}

export async function exportPdf(
  type: 'cv' | 'cover_letter',
  content: unknown,
  templateId?: number | null
): Promise<Blob> {
  const response = await apiFetch('/export-pdf', {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ type, content, template_id: templateId ?? null }),
  });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, 'Failed to export PDF'));
  }

  return response.blob();
}

export async function getTemplates(): Promise<Template[]> {
  const response = await apiFetch('/templates');
  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, 'Failed to load templates'));
  }
  return response.json();
}

export async function createTemplate(payload: {
  name: string;
  kind: TemplateKind;
  template_html: string;
}): Promise<Template> {
  const response = await apiFetch('/templates', {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, 'Failed to create template'));
  }
  return response.json();
}

export async function deleteTemplate(id: number): Promise<void> {
  const response = await apiFetch(`/templates/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, 'Failed to delete template'));
  }
}

export async function previewTemplate(kind: TemplateKind, templateHtml: string): Promise<string> {
  const response = await apiFetch('/templates/preview', {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ kind, template_html: templateHtml }),
  });
  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, 'Failed to preview template'));
  }
  const data = await response.json();
  return data.html;
}

export async function listApplications(): Promise<ApplicationListItem[]> {
  const response = await apiFetch('/applications');
  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, 'Failed to load applications'));
  }
  return response.json();
}

export async function getApplication(id: number): Promise<Application> {
  const response = await apiFetch(`/applications/${id}`);
  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, 'Failed to load application'));
  }
  return response.json();
}

export async function updateApplication(id: number, data: ApplicationUpdate): Promise<Application> {
  const response = await apiFetch(`/applications/${id}`, {
    method: 'PUT',
    headers: jsonHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, 'Failed to update application'));
  }
  return response.json();
}

export async function deleteApplication(id: number): Promise<void> {
  const response = await apiFetch(`/applications/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, 'Failed to delete application'));
  }
}

export async function testProviderConnection(
  provider: string,
  apiKey?: string,
  model?: string
): Promise<ProviderTestResult> {
  const response = await apiFetch(`/settings/${provider}/test`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ api_key: apiKey || undefined, model: model || undefined }),
  });
  if (!response.ok) {
    return { success: false, message: await parseErrorDetail(response, 'Connection test failed') };
  }
  return response.json();
}
