import { skillMatchPercent } from '@hirestack/shared';
import { pageMeta } from '../common/pagination';

export function appliedJobIdsFromMine(rows: unknown): string[] {
  if (!Array.isArray(rows)) {
    return [];
  }
  const ids = new Set<string>();
  for (const row of rows) {
    if (!row || typeof row !== 'object') {
      continue;
    }
    const item = row as { jobId?: string; job?: { id?: string } };
    const id = item.jobId || item.job?.id;
    if (id) {
      ids.add(id);
    }
  }
  return [...ids];
}

export function skillSlugsFromProfile(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }
  const body = payload as {
    skills?: Array<{ slug?: string }>;
    userSkills?: Array<{ skill?: { slug?: string } }>;
  };
  const slugs = [
    ...(body.skills ?? []).map((row) => row.slug),
    ...(body.userSkills ?? []).map((row) => row.skill?.slug),
  ].filter((slug): slug is string => Boolean(slug));
  return [...new Set(slugs)];
}

export function neededSkillSlugs(job: unknown): string[] {
  if (!job || typeof job !== 'object') {
    return [];
  }
  const skills = (job as { skills?: unknown }).skills;
  if (!Array.isArray(skills)) {
    return [];
  }
  return skills
    .map((row) => {
      if (!row || typeof row !== 'object') {
        return '';
      }
      const item = row as { slug?: string; skill?: { slug?: string } };
      return item.slug || item.skill?.slug || '';
    })
    .filter(Boolean);
}

export function attachSkillMatch(job: unknown, skillSlugs: string[]): unknown {
  if (!job || typeof job !== 'object' || !skillSlugs.length) {
    return job;
  }
  const record = job as Record<string, unknown>;
  if (typeof record.matchPercent === 'number' && record.matchPercent > 0) {
    return job;
  }
  const match = skillMatchPercent(skillSlugs, neededSkillSlugs(job));
  if (match == null) {
    return job;
  }
  return { ...record, matchPercent: match };
}

export function overlayJobSearchPage(
  payload: unknown,
  opts: {
    hideApplied: boolean;
    appliedIds: string[];
    skillSlugs: string[];
    page: number;
    pageSize: number;
  },
): unknown {
  if (!payload || typeof payload !== 'object' || !Array.isArray((payload as { data?: unknown }).data)) {
    return payload;
  }
  const page = payload as { data: unknown[]; meta?: unknown };
  const applied = new Set(opts.appliedIds);
  let data = page.data.map((job) => attachSkillMatch(job, opts.skillSlugs));
  if (opts.hideApplied && applied.size) {
    data = data.filter((job) => {
      const id = job && typeof job === 'object' ? (job as { id?: string }).id : undefined;
      return !id || !applied.has(id);
    });
    const start = (opts.page - 1) * opts.pageSize;
    return {
      data: data.slice(start, start + opts.pageSize),
      meta: pageMeta(data.length, opts.page, opts.pageSize),
    };
  }
  return { ...page, data };
}

export function recommendUnappliedJobs(
  jobs: unknown[],
  appliedIds: string[],
  skillSlugs: string[],
  limit = 4,
): unknown[] {
  const applied = new Set(appliedIds);
  const open = jobs
    .filter((job) => {
      const id = job && typeof job === 'object' ? (job as { id?: string }).id : undefined;
      return Boolean(id) && !applied.has(id as string);
    })
    .map((job) => attachSkillMatch(job, skillSlugs));
  return [...open]
    .sort((a, b) => matchValue(b) - matchValue(a))
    .filter((job) => matchValue(job) > 0)
    .slice(0, limit);
}

function matchValue(job: unknown): number {
  if (!job || typeof job !== 'object') {
    return 0;
  }
  return Number((job as { matchPercent?: number }).matchPercent ?? 0);
}

export function shouldOverlayJobApplicationsPath(path: string): boolean {
  return /^\/api\/jobs\/[^/]+\/applications$/.test(path);
}

export function overlayApplicantRows(payload: unknown, neededSlugs: string[]): unknown {
  if (!Array.isArray(payload) || !neededSlugs.length) {
    return payload;
  }
  return payload.map((row) => {
    if (!row || typeof row !== 'object') {
      return row;
    }
    const record = row as Record<string, unknown>;
    if (typeof record.matchPercent === 'number') {
      return row;
    }
    const match = skillMatchPercent(skillSlugsFromProfile(record.candidate), neededSlugs);
    if (match == null) {
      return row;
    }
    return { ...record, matchPercent: match };
  });
}

export async function overlayJobApplications(
  payload: unknown,
  jobId: string,
  opts: { upstream: string; authorization?: string; fetchImpl?: typeof fetch },
): Promise<unknown> {
  const needed = await neededSkillSlugsForJob(jobId, opts);
  return overlayApplicantRows(payload, needed);
}

async function neededSkillSlugsForJob(
  jobId: string,
  opts: { upstream: string; authorization?: string; fetchImpl?: typeof fetch },
): Promise<string[]> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const headers: Record<string, string> = {};
  if (opts.authorization) {
    headers.authorization = opts.authorization;
  }
  try {
    const mine = await fetchImpl(`${opts.upstream}/api/me/jobs`, { headers });
    if (mine.ok) {
      const rows: unknown = await mine.json();
      const job = (Array.isArray(rows) ? rows : []).find(
        (row) => row && typeof row === 'object' && (row as { id?: string }).id === jobId,
      );
      const slugs = neededSkillSlugs(job);
      if (slugs.length) {
        return slugs;
      }
    }
  } catch {
    // Fall through to the public board.
  }
  try {
    const board = await fetchImpl(`${opts.upstream}/api/jobs?pageSize=50`);
    if (!board.ok) {
      return [];
    }
    const page: unknown = await board.json();
    const jobs = page && typeof page === 'object' ? (page as { data?: unknown }).data : undefined;
    const job = (Array.isArray(jobs) ? jobs : []).find(
      (row) => row && typeof row === 'object' && (row as { id?: string }).id === jobId,
    );
    return neededSkillSlugs(job);
  } catch {
    return [];
  }
}
