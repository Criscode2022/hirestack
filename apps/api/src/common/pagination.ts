import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, type PageMeta } from '@hirestack/shared';

export function parsePage(page?: number, pageSize?: number): { skip: number; take: number; page: number; pageSize: number } {
  const safePage = Math.max(1, page ?? 1);
  const safeSize = Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize ?? DEFAULT_PAGE_SIZE));
  return {
    page: safePage,
    pageSize: safeSize,
    skip: (safePage - 1) * safeSize,
    take: safeSize,
  };
}

export function pageMeta(total: number, page: number, pageSize: number): PageMeta {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
