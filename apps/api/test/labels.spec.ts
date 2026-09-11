import { humanizeLabel, titleLabel } from '@hirestack/shared';

describe('enum labels', () => {
  it('humanizes snake-case enums for forms and chips', () => {
    expect(humanizeLabel('FULL_TIME')).toBe('full time');
    expect(humanizeLabel('NICE_TO_HAVE')).toBe('nice to have');
  });

  it('title-cases roles on public profiles', () => {
    expect(titleLabel('CANDIDATE')).toBe('Candidate');
    expect(titleLabel('EMPLOYER')).toBe('Employer');
  });
});
