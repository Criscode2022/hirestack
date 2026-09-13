const CLOSED = new Set(['REJECTED', 'WITHDRAWN']);

export function visibleKanbanColumns<T extends string>(
  columns: readonly T[],
  count: (column: T) => number,
  showClosed: boolean,
): T[] {
  const open = showClosed
    ? [...columns]
    : columns.filter((column) => !CLOSED.has(column) || count(column) > 0);
  if (count('OFFER' as T) > 0) {
    return ['OFFER' as T, ...open.filter((column) => column !== 'OFFER')];
  }
  return open;
}

export function canToggleClosedColumns<T extends string>(
  columns: readonly T[],
  count: (column: T) => number,
): boolean {
  return columns.some((column) => CLOSED.has(column) && count(column) === 0);
}
