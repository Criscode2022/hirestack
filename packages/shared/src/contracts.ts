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
  featured?: boolean;
  company: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
  };
  skills: Array<{ slug: string; name: string; weight: string }>;
  matchPercent?: number;
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
  openToWork?: boolean;
  status: UserStatus;
  company?: { id: string; name: string; slug: string; plan?: string } | null;
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

export interface PublicPersonCard {
  id: string;
  name: string;
  headline: string | null;
  location: string | null;
  openToWork: boolean;
  role: UserRole;
  company?: { id: string; name: string; slug: string } | null;
  skills: Array<{ slug: string; name: string }>;
}

export interface ExperienceItem {
  id: string;
  title: string;
  companyName: string;
  location: string | null;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
}

export interface EducationItem {
  id: string;
  school: string;
  degree: string | null;
  field: string | null;
  startYear: number | null;
  endYear: number | null;
}

export interface PublicProfile extends PublicPersonCard {
  bio: string | null;
  portfolioUrl: string | null;
  experiences: ExperienceItem[];
  education: EducationItem[];
  projects: ProjectItem[];
  recommendations: RecommendationItem[];
  connectionStatus: 'NONE' | 'PENDING_OUT' | 'PENDING_IN' | 'CONNECTED' | 'SELF';
  connectionId: string | null;
  connectionCount: number;
  completeness: number;
  followerCount?: number;
}

export interface ProjectItem {
  id: string;
  title: string;
  url: string | null;
  description: string | null;
}

export interface RecommendationItem {
  id: string;
  relationship: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string; headline: string | null };
}

export interface CompanyCard {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  headquarters: string | null;
  employeeCount: number | null;
  logoUrl: string | null;
  followerCount: number;
  openJobs: number;
}

export interface MarketTapeItem {
  kind: 'JOB' | 'POST' | 'HIRE';
  id: string;
  label: string;
  href: string;
  createdAt: string;
}

export interface SalaryInsight {
  skill: string;
  roleCount: number;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
}

export interface SearchBundle {
  jobs: PublicJobCard[];
  people: PublicPersonCard[];
  companies: CompanyCard[];
}

export interface SavedSearch {
  id: string;
  name: string;
  queryJson: Record<string, string | number | boolean | null>;
  createdAt: string;
}

export interface AnnouncementCard {
  id: string;
  title: string;
  body: string;
  location: string | null;
  workplace: Workplace | null;
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
  applicantCount: number;
  appliedByMe: boolean;
  author: {
    id: string;
    name: string;
    headline: string | null;
    company: { id: string; name: string; slug: string } | null;
  };
}

export interface NetworkPerson {
  id: string;
  name: string;
  headline: string | null;
  location: string | null;
  openToWork?: boolean;
}

export interface ConnectionRow {
  id: string;
  status: string;
  other: NetworkPerson;
}

export interface ConnectionRequest {
  id: string;
  createdAt: string;
  requester: NetworkPerson;
}

export interface ConversationSummary {
  id: string;
  other: { id: string; name: string; headline: string | null };
  lastMessage: { body: string; createdAt: string; senderId: string } | null;
  unreadCount: number;
  lastMessageAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface FeedPost {
  id: string;
  kind: string;
  body: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  author: { id: string; name: string; headline: string | null };
  company?: { id: string; name: string; slug: string } | null;
  comments: Array<{ id: string; body: string; createdAt: string; author: { id: string; name: string } }>;
}

export type { JobStatus };
