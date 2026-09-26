export interface Experience {
  id?: number;
  company: string;
  title: string;
  start_date: string;
  end_date?: string | null;
  bullet_points: string[];
}

export interface Project {
  id?: number;
  name: string;
  description: string;
  tech_stack: string;
  link?: string | null;
}

export interface Certification {
  id?: number;
  name: string;
  issuer: string;
  date_earned?: string | null;
}

export interface Education {
  id?: number;
  institution: string;
  degree: string;
  field?: string | null;
  graduation_year?: string | null;
}

export interface Profile {
  id?: number | null;
  full_name: string;
  email: string;
  phone: string;
  location: string;
  linkedin?: string | null;
  portfolio_url?: string | null;
  summary: string;
  skills: string[];
  experiences: Experience[];
  projects: Project[];
  certifications: Certification[];
  education: Education[];
}

/** What the server returns for a saved provider. The API key itself is never sent back. */
export interface ProviderSetting {
  id?: number;
  provider: string;
  has_api_key: boolean;
  /** e.g. "••••1234" -- the last four characters, for recognising which key is saved. */
  api_key_hint: string;
  model: string;
  is_default: boolean;
}

/** Models a provider offers the saved key. Anything but 'ok' means "use the built-in suggestions". */
export interface ModelList {
  provider: string;
  status: 'ok' | 'no_key' | 'invalid_key' | 'error';
  models: string[];
  message: string;
}

export type UsageStatus = 'healthy' | 'low' | 'limited' | 'invalid_key' | 'error' | 'no_key';

/** One limit a provider reports, e.g. requests per day or tokens per minute. */
export interface UsageMeter {
  id: string;
  label: string;
  limit: number;
  remaining: number;
  resets_in_seconds: number | null;
}

export interface UsageBalance {
  currency: string;
  total: string;
  granted: string;
  topped_up: string;
}

export interface ProviderUsage {
  provider: string;
  status: UsageStatus;
  message: string;
  checked_at: string;
  meters: UsageMeter[];
  balance: UsageBalance | null;
  /** What this provider can't report (e.g. Gemini has no quota API). */
  note: string | null;
}

/** What the browser sends when saving. A blank api_key keeps the key already saved. */
export interface ProviderSettingInput {
  provider: string;
  api_key: string;
  model: string;
  is_default: boolean;
}

/** Feature toggles from Settings -> Preferences. New settings are added here as they ship. */
export interface UserPreferences {
  gap_analysis_enabled: boolean;
}

export const AI_PROVIDERS = ['groq', 'openai', 'anthropic', 'gemini', 'deepseek'] as const;
export type AiProviderName = (typeof AI_PROVIDERS)[number];

export const APPLICATION_STATUSES = ['Generated', 'Applied', 'Interview', 'Offer', 'Rejected'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export interface GenerateRequest {
  job_description: string;
  company: string;
  position: string;
  provider?: string;
}

export interface GeneratedCV {
  full_name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  portfolio_url?: string;
  summary?: string;
  skills?: string[];
  experience?: Array<{
    company: string;
    title: string;
    start_date: string;
    end_date?: string | null;
    bullet_points: string[];
  }>;
  projects?: Array<{
    name: string;
    description: string;
    tech_stack: string;
    link?: string | null;
  }>;
  certifications?: Array<{
    name: string;
    issuer: string;
    date_earned?: string | null;
  }>;
  education?: Array<{
    institution: string;
    degree: string;
    field?: string | null;
    graduation_year?: string | null;
  }>;
  [key: string]: any;
}

export type GapCategory = 'experience' | 'skill' | 'certification';
export type GapSeverity = 'blocking' | 'minor';

/** One concrete gap between the job's stated requirements and the candidate's profile. */
export interface Gap {
  category: GapCategory;
  severity: GapSeverity;
  requirement: string;
  candidate_has: string;
  recommendation: string;
}

/** Result of comparing the job's explicit requirements against the candidate's profile.
 * `score`/`gaps` are empty and `note` explains why when the job description didn't state
 * anything concrete enough to check (no fabricated score). */
export interface GapAnalysis {
  score: number | null;
  gaps: Gap[];
  matched_count: number;
  total_count: number;
  note: string | null;
}

export interface GenerateResponse {
  cv: GeneratedCV;
  cover_letter: string;
  application_id?: number | null;
  gap_analysis?: GapAnalysis | null;
}

export interface ApplicationListItem {
  id: number;
  company: string;
  position: string;
  provider_used: string;
  model_used: string;
  status: ApplicationStatus | string;
  created_at: string;
  updated_at: string;
}

export interface Application extends ApplicationListItem {
  job_description: string;
  generated_cv: GeneratedCV;
  generated_cover_letter: string;
  gap_analysis?: GapAnalysis | null;
}

export interface ApplicationUpdate {
  company?: string;
  position?: string;
  job_description?: string;
  generated_cv?: GeneratedCV;
  generated_cover_letter?: string;
  status?: ApplicationStatus | string;
}

export interface ProviderTestResult {
  success: boolean;
  message: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  display_name: string;
  is_admin: boolean;
}

export type TemplateKind = 'cv' | 'cover_letter';

export interface Template {
  id: number;
  user_id: string | null;
  name: string;
  kind: TemplateKind;
  is_custom: boolean;
  template_html: string;
  created_at: string;
}
