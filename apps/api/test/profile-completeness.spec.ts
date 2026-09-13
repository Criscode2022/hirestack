import { profileCompleteness } from '../src/network/profile-completeness';

describe('profileCompleteness', () => {
  it('does not ding hiring leads for a missing resume', () => {
    expect(
      profileCompleteness({
        role: 'EMPLOYER',
        headline: 'Head of Talent at Northwind Labs',
        location: 'Austin, TX',
        bio: 'I hire operators who ship.',
        company: { slug: 'northwind-labs' },
        experiences: [{ id: '1' }],
        userSkills: [],
        education: [],
        projects: [],
        _count: { resumes: 0 },
      }),
    ).toBe(100);
  });

  it('keeps the candidate checklist including a current resume', () => {
    expect(
      profileCompleteness({
        role: 'CANDIDATE',
        headline: 'Angular engineer',
        location: 'Denver, CO',
        bio: 'Looking for high-ownership roles.',
        userSkills: [{ slug: 'angular' }],
        experiences: [{ id: '1' }],
        education: [{ id: '1' }],
        projects: [],
        _count: { resumes: 1 },
      }),
    ).toBe(88);
  });
});
