import type {
  Profile,
  ProviderSetting,
  GenerateRequest,
  GenerateResponse,
  ApplicationListItem,
  Application,
  ApplicationUpdate,
  ProviderTestResult,
} from '../types';

const API_BASE = '/api';

async function parseErrorDetail(response: Response, fallback: string): Promise<string> {
  const err = await response.json().catch(() => ({ detail: fallback }));
  return err.detail || fallback;
}

export async function getProfile(): Promise<Profile> {
  const response = await fetch(`${API_BASE}/profile`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Failed to fetch profile' }));
    throw new Error(err.detail || 'Failed to fetch profile');
  }
  return response.json();
}

export async function saveProfile(profile: Profile): Promise<Profile> {
  const response = await fetch(`${API_BASE}/profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(profile),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Failed to save profile' }));
    throw new Error(err.detail || 'Failed to save profile');
  }
  return response.json();
}

export async function uploadCv(file: File): Promise<{ text: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/profile/upload-cv`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Failed to extract text from CV' }));
    throw new Error(err.detail || 'Failed to upload and extract CV');
  }

  return response.json();
}

export async function parseCv(file: File): Promise<{ parsed_profile: Profile; raw_text: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/profile/parse-cv`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Failed to parse CV with AI' }));
    throw new Error(err.detail || 'Failed to parse CV with AI');
  }

  return response.json();
}

export async function getSettings(): Promise<ProviderSetting[]> {
  const response = await fetch(`${API_BASE}/settings`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Failed to fetch settings' }));
    throw new Error(err.detail || 'Failed to fetch settings');
  }
  return response.json();
}

export async function getAvailableModels(provider: string, apiKey?: string): Promise<string[]> {
  const params = new URLSearchParams({ provider });
  if (apiKey) params.append('api_key', apiKey);
  const response = await fetch(`${API_BASE}/settings/models?${params.toString()}`);
  if (!response.ok) {
    return [];
  }
  const data = await response.json();
  return data.models || [];
}

export async function saveSetting(setting: Omit<ProviderSetting, 'id'>): Promise<ProviderSetting> {
  const response = await fetch(`${API_BASE}/settings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(setting),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Failed to save setting' }));
    throw new Error(err.detail || 'Failed to save setting');
  }
  return response.json();
}

export async function generateCvAndCoverLetter(data: GenerateRequest): Promise<GenerateResponse> {
  const response = await fetch(`${API_BASE}/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Generation failed' }));
    throw new Error(err.detail || 'Generation failed');
  }

  return response.json();
}

export async function exportPdf(type: 'cv' | 'cover_letter', content: unknown): Promise<Blob> {
  const response = await fetch(`${API_BASE}/export-pdf`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type, content }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Failed to export PDF' }));
    throw new Error(err.detail || 'Failed to export PDF');
  }

  return response.blob();
}

export async function listApplications(): Promise<ApplicationListItem[]> {
  const response = await fetch(`${API_BASE}/applications`);
  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, 'Failed to load applications'));
  }
  return response.json();
}

export async function getApplication(id: number): Promise<Application> {
  const response = await fetch(`${API_BASE}/applications/${id}`);
  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, 'Failed to load application'));
  }
  return response.json();
}

export async function updateApplication(id: number, data: ApplicationUpdate): Promise<Application> {
  const response = await fetch(`${API_BASE}/applications/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, 'Failed to update application'));
  }
  return response.json();
}

export async function deleteApplication(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/applications/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, 'Failed to delete application'));
  }
}

export async function testProviderConnection(
  provider: string,
  apiKey?: string,
  model?: string
): Promise<ProviderTestResult> {
  const response = await fetch(`${API_BASE}/settings/${provider}/test`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ api_key: apiKey || undefined, model: model || undefined }),
  });
  if (!response.ok) {
    return { success: false, message: await parseErrorDetail(response, 'Connection test failed') };
  }
  return response.json();
}
