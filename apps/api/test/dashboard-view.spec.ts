import { buildEmployerDashboard } from '../src/applications/dashboard-view';

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
});
