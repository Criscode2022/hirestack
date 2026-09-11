export const UserRole = {
  CANDIDATE: 'CANDIDATE',
  EMPLOYER: 'EMPLOYER',
  ADMIN: 'ADMIN',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];
export const USER_ROLES = Object.values(UserRole);

export const UserStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const WorkAuthorization = {
  US_CITIZEN: 'US_CITIZEN',
  PERMANENT_RESIDENT: 'PERMANENT_RESIDENT',
  WORK_VISA: 'WORK_VISA',
  NEEDS_SPONSORSHIP: 'NEEDS_SPONSORSHIP',
  OTHER: 'OTHER',
} as const;
export type WorkAuthorization = (typeof WorkAuthorization)[keyof typeof WorkAuthorization];

export const EmploymentType = {
  FULL_TIME: 'FULL_TIME',
  PART_TIME: 'PART_TIME',
  CONTRACT: 'CONTRACT',
  FREELANCE: 'FREELANCE',
} as const;
export type EmploymentType = (typeof EmploymentType)[keyof typeof EmploymentType];
export const EMPLOYMENT_TYPES = Object.values(EmploymentType);

export const Workplace = {
  REMOTE: 'REMOTE',
  HYBRID: 'HYBRID',
  ONSITE: 'ONSITE',
} as const;
export type Workplace = (typeof Workplace)[keyof typeof Workplace];
export const WORKPLACES = Object.values(Workplace);

export const Seniority = {
  INTERN: 'INTERN',
  JUNIOR: 'JUNIOR',
  MID: 'MID',
  SENIOR: 'SENIOR',
  STAFF: 'STAFF',
} as const;
export type Seniority = (typeof Seniority)[keyof typeof Seniority];
export const SENIORITIES = Object.values(Seniority);

export const JobStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  CLOSED: 'CLOSED',
} as const;
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

export const SkillWeight = {
  REQUIRED: 'REQUIRED',
  NICE_TO_HAVE: 'NICE_TO_HAVE',
} as const;
export type SkillWeight = (typeof SkillWeight)[keyof typeof SkillWeight];

export const ApplicationStatus = {
  SUBMITTED: 'SUBMITTED',
  REVIEWING: 'REVIEWING',
  INTERVIEW: 'INTERVIEW',
  OFFER: 'OFFER',
  HIRED: 'HIRED',
  REJECTED: 'REJECTED',
  WITHDRAWN: 'WITHDRAWN',
} as const;
export type ApplicationStatus = (typeof ApplicationStatus)[keyof typeof ApplicationStatus];
export const APPLICATION_STATUSES = Object.values(ApplicationStatus);

export const ReportStatus = {
  OPEN: 'OPEN',
  RESOLVED: 'RESOLVED',
} as const;
export type ReportStatus = (typeof ReportStatus)[keyof typeof ReportStatus];

export const JobSort = {
  NEWEST: 'newest',
  SALARY: 'salary',
  RELEVANCE: 'relevance',
} as const;
export type JobSort = (typeof JobSort)[keyof typeof JobSort];

export const ConnectionStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED',
} as const;
export type ConnectionStatus = (typeof ConnectionStatus)[keyof typeof ConnectionStatus];

export const NotificationType = {
  CONNECTION_REQUEST: 'CONNECTION_REQUEST',
  CONNECTION_ACCEPTED: 'CONNECTION_ACCEPTED',
  MESSAGE: 'MESSAGE',
  APPLICATION_UPDATE: 'APPLICATION_UPDATE',
  JOB_MATCH: 'JOB_MATCH',
  COMPANY_POST: 'COMPANY_POST',
  COMMENT: 'COMMENT',
  RECOMMENDATION: 'RECOMMENDATION',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const PostKind = {
  UPDATE: 'UPDATE',
  JOB_SHARE: 'JOB_SHARE',
  HIRING: 'HIRING',
} as const;
export type PostKind = (typeof PostKind)[keyof typeof PostKind];

export const BillingPlan = {
  FREE: 'FREE',
  STARTER: 'STARTER',
  GROWTH: 'GROWTH',
} as const;
export type BillingPlan = (typeof BillingPlan)[keyof typeof BillingPlan];
export const BILLING_PLAN_IDS = Object.values(BillingPlan);
