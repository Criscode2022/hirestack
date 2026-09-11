export function isDirectoryProfile(row: {
  headline?: string | null;
  openToWork?: boolean;
  skills?: unknown[];
}): boolean {
  return Boolean(row.headline?.trim()) || Boolean(row.openToWork) || (row.skills?.length ?? 0) > 0;
}
