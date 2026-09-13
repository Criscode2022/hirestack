import type { Prisma } from '@prisma/client';
import { pageMeta, parsePage } from '../common/pagination';

/** Postgres/Prisma enum order is CANDIDATE, EMPLOYER, ADMIN — DESC puts staff first. */
export const ADMIN_DESK_USER_ORDER: Prisma.UserOrderByWithRelationInput[] = [
  { role: 'desc' },
  { createdAt: 'desc' },
];

export const ADMIN_DESK_ROLE_RANK: Record<string, number> = {
  ADMIN: 0,
  EMPLOYER: 1,
  CANDIDATE: 2,
};

export type AdminDeskUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  createdAt: Date | string;
};

export function compareAdminDeskUsers(
  a: { role: string; createdAt: Date | string },
  b: { role: string; createdAt: Date | string },
): number {
  const rank = (ADMIN_DESK_ROLE_RANK[a.role] ?? 99) - (ADMIN_DESK_ROLE_RANK[b.role] ?? 99);
  if (rank !== 0) {
    return rank;
  }
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export function isAutomationSignup(row: { email: string; name: string }) {
  return /^pw[.@]/i.test(row.email) || /^Playwright/i.test(row.name);
}

export function rankAdminDeskPage(rows: AdminDeskUser[], page = 1, pageSize = 20, q?: string) {
  const needle = q?.trim().toLowerCase();
  let data = [...rows].sort(compareAdminDeskUsers);
  if (needle) {
    data = data.filter(
      (row) => row.email.toLowerCase().includes(needle) || row.name.toLowerCase().includes(needle),
    );
  } else {
    data = data.filter((row) => !isAutomationSignup(row));
  }
  const paging = parsePage(page, pageSize);
  return {
    data: data.slice(paging.skip, paging.skip + paging.take),
    meta: pageMeta(data.length, paging.page, paging.pageSize),
  };
}

export async function fetchAdminDeskUsers(
  fetchImpl: typeof fetch,
  baseUrl: string,
  authorization: string,
): Promise<AdminDeskUser[]> {
  const rows: AdminDeskUser[] = [];
  for (let page = 1; page <= 8; page += 1) {
    const response = await fetchImpl(`${baseUrl}/api/admin/users?page=${page}&pageSize=50`, {
      headers: { authorization },
    });
    if (!response.ok) {
      break;
    }
    const json = (await response.json()) as { data?: AdminDeskUser[] };
    const chunk = Array.isArray(json.data) ? json.data : [];
    rows.push(...chunk);
    if (chunk.length < 50) {
      break;
    }
  }
  return rows;
}
