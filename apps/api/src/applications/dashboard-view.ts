export interface DashboardJob {
  status?: string;
}

export interface DashboardApplication {
  status: string;
  createdAt: string;
}

export function countPipeline(rows: Array<{ status?: string }>): Record<string, number> {
  const pipeline: Record<string, number> = {};
  for (const row of rows) {
    if (!row.status) {
      continue;
    }
    pipeline[row.status] = (pipeline[row.status] ?? 0) + 1;
  }
  return pipeline;
}

export function mergeJobPipelines(
  payload: unknown,
  pipelines: Record<string, Record<string, number>>,
): unknown {
  if (!Array.isArray(payload)) {
    return payload;
  }
  return payload.map((job) => {
    if (!job || typeof job !== 'object') {
      return job;
    }
    const id = (job as { id?: string }).id;
    const extra = id ? pipelines[id] : undefined;
    if (!extra) {
      return job;
    }
    return { ...job, pipeline: extra };
  });
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
  const pipeline = countPipeline(applications);
  return {
    openJobs,
    newApplicantsThisWeek,
    pipeline,
    hired: pipeline.HIRED ?? 0,
  };
}
