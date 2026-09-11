import { ADMIN_DESK_USER_ORDER, compareAdminDeskUsers, rankAdminDeskPage } from '../src/admin/admin-users';

describe('admin desk user ranking', () => {
  it('asks Prisma to sort staff before candidates', () => {
    expect(ADMIN_DESK_USER_ORDER).toEqual([{ role: 'desc' }, { createdAt: 'desc' }]);
  });

  it('keeps admins, then employers, then the newest candidates', () => {
    const rows = [
      { role: 'CANDIDATE', createdAt: '2026-09-11T18:00:00.000Z', name: 'Playwright' },
      { role: 'EMPLOYER', createdAt: '2026-01-01T00:00:00.000Z', name: 'Nora' },
      { role: 'ADMIN', createdAt: '2026-01-01T00:00:00.000Z', name: 'Avery' },
      { role: 'CANDIDATE', createdAt: '2026-02-01T00:00:00.000Z', name: 'Alex' },
    ];
    expect([...rows].sort(compareAdminDeskUsers).map((row) => row.name)).toEqual([
      'Avery',
      'Nora',
      'Playwright',
      'Alex',
    ]);
  });

  it('filters and pages a staff-first desk from an upstream dump', () => {
    const rows = [
      {
        id: '1',
        email: 'pw@hirestack.dev',
        name: 'Playwright',
        role: 'CANDIDATE',
        status: 'ACTIVE',
        createdAt: '2026-09-11T18:00:00.000Z',
      },
      {
        id: '2',
        email: 'admin@hirestack.dev',
        name: 'Avery Admin',
        role: 'ADMIN',
        status: 'ACTIVE',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    const page = rankAdminDeskPage(rows, 1, 20, 'Avery');
    expect(page.data.map((row) => row.email)).toEqual(['admin@hirestack.dev']);
    expect(page.meta.total).toBe(1);
  });

  it('hides Playwright signups from the default desk and keeps them searchable', () => {
    const rows = [
      {
        id: '1',
        email: 'pw.1@hirestack.dev',
        name: 'Playwright Candidate',
        role: 'CANDIDATE',
        status: 'ACTIVE',
        createdAt: '2026-09-11T18:00:00.000Z',
      },
      {
        id: '2',
        email: 'admin@hirestack.dev',
        name: 'Avery Admin',
        role: 'ADMIN',
        status: 'ACTIVE',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: '3',
        email: 'candidate.alex@hirestack.dev',
        name: 'Alex Rivera',
        role: 'CANDIDATE',
        status: 'ACTIVE',
        createdAt: '2026-01-02T00:00:00.000Z',
      },
    ];
    expect(rankAdminDeskPage(rows, 1, 20).data.map((row) => row.name)).toEqual(['Avery Admin', 'Alex Rivera']);
    expect(rankAdminDeskPage(rows, 1, 20, 'Playwright').data.map((row) => row.email)).toEqual(['pw.1@hirestack.dev']);
  });
});
