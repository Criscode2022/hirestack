import type { Prisma } from '@prisma/client';

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
