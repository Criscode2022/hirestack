export function isDirectoryProfile(row: {
  headline?: string | null;
  openToWork?: boolean;
  skills?: unknown[];
}): boolean {
  return Boolean(row.headline?.trim()) || Boolean(row.openToWork) || (row.skills?.length ?? 0) > 0;
}

export function mixDirectoryPeople<T extends { id: string }>(leads: T[], candidates: T[], limit = 48): T[] {
  const byId = new Map<string, T>();
  for (const row of [...leads, ...candidates]) {
    if (row?.id) {
      byId.set(row.id, row);
    }
  }
  return [...byId.values()].slice(0, limit);
}
