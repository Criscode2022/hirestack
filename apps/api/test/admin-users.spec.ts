import { ADMIN_DESK_USER_ORDER, compareAdminDeskUsers } from '../src/admin/admin-users';

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
});
