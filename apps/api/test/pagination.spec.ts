import { parsePage, pageMeta } from '../src/common/pagination';

describe('pagination', () => {
  it('clamps page and page size', () => {
    expect(parsePage(0, 0)).toEqual({ page: 1, pageSize: 1, skip: 0, take: 1 });
    expect(parsePage(2, 12)).toEqual({ page: 2, pageSize: 12, skip: 12, take: 12 });
    expect(parsePage(1, 999).pageSize).toBe(50);
  });

  it('builds page metadata', () => {
    expect(pageMeta(25, 2, 12)).toEqual({ page: 2, pageSize: 12, total: 25, totalPages: 3 });
    expect(pageMeta(0, 1, 12).totalPages).toBe(1);
  });
});
