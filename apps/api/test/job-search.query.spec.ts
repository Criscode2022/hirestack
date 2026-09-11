import { JobSort, Workplace } from '@hirestack/shared';
import { buildJobSearchQuery } from '../src/jobs/job-search.query';

describe('buildJobSearchQuery', () => {
  it('defaults to published jobs ordered by newest', () => {
    const result = buildJobSearchQuery({});
    expect(result.where.AND).toEqual(
      expect.arrayContaining([expect.objectContaining({ status: 'PUBLISHED', deletedAt: null })]),
    );
    expect(result.orderBy[0]).toEqual({ featured: 'desc' });
    expect(result.orderBy[1]).toEqual({ publishedAt: 'desc' });
    expect(result.sort).toBe(JobSort.NEWEST);
  });

  it('applies workplace, skills, and salary filters', () => {
    const result = buildJobSearchQuery({
      workplace: Workplace.REMOTE,
      skills: 'angular,nestjs',
      salaryMin: 100000,
      postedWithinDays: 7,
    });
    const clauses = result.where.AND as object[];
    expect(clauses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ workplace: 'REMOTE' }),
        expect.objectContaining({
          skills: { some: { skill: { slug: { in: ['angular', 'nestjs'] } } } },
        }),
      ]),
    );
  });

  it('uses relevance sort when a keyword is present', () => {
    const result = buildJobSearchQuery({ q: 'Angular' });
    expect(result.q).toBe('Angular');
    expect(result.sort).toBe(JobSort.RELEVANCE);
  });
});
