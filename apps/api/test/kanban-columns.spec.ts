import {
  canToggleClosedColumns,
  visibleKanbanColumns,
} from '../../web/src/app/shared/kanban-columns';

const COLUMNS = ['SUBMITTED', 'REVIEWING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED', 'WITHDRAWN'] as const;

describe('visibleKanbanColumns', () => {
  it('pins Offer first and hides empty closed stages', () => {
    const count = (column: string) => (column === 'OFFER' || column === 'SUBMITTED' ? 1 : 0);
    expect(visibleKanbanColumns(COLUMNS, count, false)).toEqual([
      'OFFER',
      'SUBMITTED',
      'REVIEWING',
      'INTERVIEW',
      'HIRED',
    ]);
  });

  it('keeps closed stages when they have cards or the toggle is on', () => {
    const count = (column: string) => (column === 'REJECTED' ? 2 : 0);
    expect(visibleKanbanColumns(COLUMNS, count, false)).toContain('REJECTED');
    expect(visibleKanbanColumns(COLUMNS, count, true)).toEqual([...COLUMNS]);
  });

  it('offers a closed-stage toggle when rejected or withdrawn is empty', () => {
    expect(canToggleClosedColumns(COLUMNS, () => 0)).toBe(true);
    expect(canToggleClosedColumns(COLUMNS, (column) => (column === 'REJECTED' || column === 'WITHDRAWN' ? 1 : 0))).toBe(
      false,
    );
  });
});
