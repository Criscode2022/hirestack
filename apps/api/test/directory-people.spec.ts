import { isDirectoryProfile, mixDirectoryPeople } from '../src/network/directory-people';

describe('marketplace directory', () => {
  it('hides empty Playwright-style signups and keeps complete profiles', () => {
    expect(isDirectoryProfile({ headline: null, openToWork: false, skills: [] })).toBe(false);
    expect(isDirectoryProfile({ headline: '  ', openToWork: false, skills: [] })).toBe(false);
    expect(isDirectoryProfile({ headline: 'Angular engineer', openToWork: false, skills: [] })).toBe(true);
    expect(isDirectoryProfile({ headline: null, openToWork: true, skills: [] })).toBe(true);
    expect(isDirectoryProfile({ headline: null, openToWork: false, skills: [{ slug: 'angular' }] })).toBe(true);
  });

  it('pins hiring leads ahead of a candidate-heavy page', () => {
    const mixed = mixDirectoryPeople(
      [{ id: 'nora', name: 'Nora Chen' }],
      Array.from({ length: 60 }, (_, i) => ({ id: `c${i}` })),
      48,
    );
    expect(mixed[0]?.id).toBe('nora');
    expect(mixed).toHaveLength(48);
  });
});
