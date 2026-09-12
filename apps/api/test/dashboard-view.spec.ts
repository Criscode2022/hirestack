import { buildEmployerDashboard, countPipeline, mergeJobPipelines } from '../src/applications/dashboard-view';

describe('buildEmployerDashboard', () => {
  it('counts published jobs and groups applicants by status', () => {
    const now = Date.parse('2026-09-11T12:00:00.000Z');
    const view = buildEmployerDashboard(
      [
        { status: 'PUBLISHED' },
        { status: 'PUBLISHED' },
        { status: 'DRAFT' },
      ],
      [
        { status: 'SUBMITTED', createdAt: '2026-09-10T12:00:00.000Z' },
        { status: 'HIRED', createdAt: '2026-08-01T12:00:00.000Z' },
        { status: 'HIRED', createdAt: '2026-09-09T12:00:00.000Z' },
      ],
      now,
    );
    expect(view.openJobs).toBe(2);
    expect(view.newApplicantsThisWeek).toBe(2);
    expect(view.pipeline).toEqual({ SUBMITTED: 1, HIRED: 2 });
    expect(view.hired).toBe(2);
  });

  it('counts statuses and attaches per-job pipelines', () => {
    expect(countPipeline([{ status: 'OFFER' }, { status: 'OFFER' }, { status: 'SUBMITTED' }])).toEqual({
      OFFER: 2,
      SUBMITTED: 1,
    });
    expect(
      mergeJobPipelines(
        [
          { id: 'job_1', title: 'Design systems' },
          { id: 'job_2', title: 'iOS' },
        ],
        { job_1: { OFFER: 1, SUBMITTED: 2 } },
      ),
    ).toEqual([
      { id: 'job_1', title: 'Design systems', pipeline: { OFFER: 1, SUBMITTED: 2 } },
      { id: 'job_2', title: 'iOS' },
    ]);
  });
});
