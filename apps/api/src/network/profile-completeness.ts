export function profileCompleteness(user: {
  role?: string | null;
  headline?: string | null;
  location?: string | null;
  bio?: string | null;
  company?: unknown;
  userSkills?: unknown[];
  experiences?: unknown[];
  education?: unknown[];
  projects?: unknown[];
  _count?: { resumes?: number };
}): number {
  const checks =
    user.role === 'EMPLOYER' || user.role === 'ADMIN'
      ? [
          Boolean(user.headline?.trim()),
          Boolean(user.location?.trim()),
          Boolean(user.bio?.trim()),
          (user.experiences?.length ?? 0) > 0,
          Boolean(user.company),
        ]
      : [
          Boolean(user.headline?.trim()),
          Boolean(user.location?.trim()),
          Boolean(user.bio?.trim()),
          (user.userSkills?.length ?? 0) > 0,
          (user.experiences?.length ?? 0) > 0,
          (user.education?.length ?? 0) > 0,
          (user.projects?.length ?? 0) > 0,
          (user._count?.resumes ?? 0) > 0,
        ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
