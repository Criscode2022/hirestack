import { isDirectoryProfile } from '../src/network/directory-people';

describe('marketplace directory', () => {
  it('hides empty Playwright-style signups and keeps complete profiles', () => {
    expect(isDirectoryProfile({ headline: null, openToWork: false, skills: [] })).toBe(false);
    expect(isDirectoryProfile({ headline: '  ', openToWork: false, skills: [] })).toBe(false);
    expect(isDirectoryProfile({ headline: 'Angular engineer', openToWork: false, skills: [] })).toBe(true);
    expect(isDirectoryProfile({ headline: null, openToWork: true, skills: [] })).toBe(true);
    expect(isDirectoryProfile({ headline: null, openToWork: false, skills: [{ slug: 'angular' }] })).toBe(true);
  });
});
