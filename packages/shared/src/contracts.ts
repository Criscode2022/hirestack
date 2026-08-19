import type {
  ApplicationStatus,
  EmploymentType,
  JobSort,
  JobStatus,
  Seniority,
  UserRole,
  UserStatus,
  WorkAuthorization,
  Workplace,
} from './enums';

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string;
  details?: unknown;
}

export interface JobSearchQuery {
  q?: string;
  location?: string;
  workplace?: Workplace;
  type?: EmploymentType;
  seniority?: Seniority;
  salaryMin?: number;
  salaryMax?: number;
  skills?: string;
  postedWithinDays?: number;
  page?: number;
  pageSize?: number;
  sort?: JobSort;
}

export interface PublicJobCard {
  id: string;
  slug: string;
  title: string;
  location: string | null;
  workplace: Workplace;
  employmentType: EmploymentType;
  seniority: Seniority;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  publishedAt: string | null;
  company: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
  };
  skills: Array<{ slug: string; name: string; weight: string }>;
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  headline: string | null;
  location: string | null;
  bio: string | null;
  portfolioUrl: string | null;
  desiredSalaryMin: number | null;
  desiredSalaryMax: number | null;
  workAuthorization: WorkAuthorization | null;
  status: UserStatus;
  company?: { id: string; name: string; slug: string } | null;
}

export interface JobStatusCounts {
  DRAFT: number;
  PUBLISHED: number;
  CLOSED: number;
}

export interface PipelineCounts {
  SUBMITTED: number;
  REVIEWING: number;
  INTERVIEW: number;
  OFFER: number;
  HIRED: number;
  REJECTED: number;
  WITHDRAWN: number;
}

export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 50;
export const MAX_COVER_LETTER = 2000;
export const MAX_RESUME_BYTES = 5 * 1024 * 1024;
export const ACCESS_TOKEN_TTL = '15m';
export const REFRESH_TOKEN_TTL_DAYS = 7;
export const REFRESH_COOKIE = 'hs_refresh';

export type { JobStatus };
