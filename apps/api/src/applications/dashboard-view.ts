export interface DashboardJob {
  status?: string;
}

export interface DashboardApplication {
  status: string;
  createdAt: string;
}

export function buildEmployerDashboard(
  jobs: DashboardJob[],
  applications: DashboardApplication[],
  now = Date.now(),
) {
  const openJobs = jobs.filter((job) => job.status === 'PUBLISHED').length;
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const newApplicantsThisWeek = applications.filter(
    (row) => new Date(row.createdAt).getTime() >= weekAgo,
  ).length;
  const pipeline: Record<string, number> = {};
  for (const row of applications) {
    pipeline[row.status] = (pipeline[row.status] ?? 0) + 1;
  }
  return {
    openJobs,
    newApplicantsThisWeek,
    pipeline,
    hired: pipeline.HIRED ?? 0,
  };
}
