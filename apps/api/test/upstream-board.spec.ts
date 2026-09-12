import {
  appliedJobIdsFromMine,
  attachSkillMatch,
  overlayJobSearchPage,
  recommendUnappliedJobs,
  skillSlugsFromProfile,
} from '../src/jobs/upstream-board';

const angular = {
  id: 'job_angular',
  title: 'Senior Angular Engineer',
  skills: [{ slug: 'angular', name: 'Angular', weight: 'MUST' }, { slug: 'rxjs', name: 'RxJS', weight: 'NICE' }],
};
const android = {
  id: 'job_android',
  title: 'Android Engineer',
  skills: [{ slug: 'kotlin', name: 'Kotlin', weight: 'MUST' }],
};
const vue = {
  id: 'job_vue',
  title: 'Freelance Vue Specialist',
  skills: [
    { slug: 'typescript', name: 'TypeScript', weight: 'MUST' },
    { slug: 'angular', name: 'Angular', weight: 'NICE' },
    { slug: 'vue', name: 'Vue', weight: 'MUST' },
  ],
};

describe('upstream job board overlay', () => {
  it('reads applied job ids from mine rows', () => {
    expect(
      appliedJobIdsFromMine([
        { jobId: 'job_a' },
        { job: { id: 'job_b' } },
        { job: { title: 'No id' } },
      ]),
    ).toEqual(['job_a', 'job_b']);
  });

  it('reads skill slugs from public profiles and /me userSkills', () => {
    expect(
      skillSlugsFromProfile({
        skills: [{ slug: 'angular' }],
        userSkills: [{ skill: { slug: 'rxjs' } }, { skill: { slug: 'angular' } }],
      }),
    ).toEqual(['angular', 'rxjs']);
  });

  it('attaches skill match from slugs and nested skill records', () => {
    const card = attachSkillMatch(angular, ['angular', 'rxjs', 'tailwind']) as { matchPercent?: number };
    expect(card.matchPercent).toBe(100);
    const detail = attachSkillMatch(
      { id: 'job_nested', skills: [{ skill: { slug: 'angular' } }, { skill: { slug: 'go' } }] },
      ['angular'],
    ) as { matchPercent?: number };
    expect(detail.matchPercent).toBe(50);
  });

  it('hides applied roles and re-paginates the remaining board', () => {
    const overlaid = overlayJobSearchPage(
      { data: [angular, android, vue], meta: { page: 1, pageSize: 12, total: 3, totalPages: 1 } },
      {
        hideApplied: true,
        appliedIds: ['job_angular'],
        skillSlugs: ['angular', 'typescript'],
        page: 1,
        pageSize: 12,
      },
    ) as { data: Array<{ id: string; matchPercent?: number }>; meta: { total: number } };
    expect(overlaid.data.map((job) => job.id)).toEqual(['job_android', 'job_vue']);
    expect(overlaid.meta.total).toBe(2);
    expect(overlaid.data[1]?.matchPercent).toBe(67);
  });

  it('fills For you with unapplied roles, highest match first', () => {
    const reco = recommendUnappliedJobs(
      [angular, android, vue],
      ['job_angular'],
      ['typescript', 'angular'],
      4,
    ) as Array<{ id: string; matchPercent?: number }>;
    expect(reco.map((job) => job.id)).toEqual(['job_vue', 'job_android']);
    expect(reco[0]?.matchPercent).toBe(67);
  });
});
