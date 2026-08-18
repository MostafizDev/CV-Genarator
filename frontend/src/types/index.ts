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

export interface ProviderSetting {
  id?: number;
  provider: string;
  api_key: string;
  model: string;
  is_default: boolean;
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

export interface GenerateResponse {
  cv: GeneratedCV;
  cover_letter: string;
  application_id?: number | null;
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
