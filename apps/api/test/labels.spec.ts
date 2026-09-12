import { clipLabel, humanizeLabel, skillMatchPercent, titleLabel } from '@hirestack/shared';

describe('enum labels', () => {
  it('humanizes snake-case enums for forms and chips', () => {
    expect(humanizeLabel('FULL_TIME')).toBe('full time');
    expect(humanizeLabel('NICE_TO_HAVE')).toBe('nice to have');
  });

  it('title-cases roles on public profiles', () => {
    expect(titleLabel('CANDIDATE')).toBe('Candidate');
    expect(titleLabel('EMPLOYER')).toBe('Employer');
    expect(titleLabel('FULL_TIME')).toBe('Full Time');
    expect(titleLabel('NICE_TO_HAVE')).toBe('Nice To Have');
  });

  it('clips activity copy on a word boundary', () => {
    expect(clipLabel('Short note')).toBe('Short note');
    expect(clipLabel('Staff frontend looking for a team that still does design critique. Seattle or remote.', 48)).toBe(
      'Staff frontend looking for a team that still…',
    );
  });

  it('scores overlap against required skills', () => {
    expect(skillMatchPercent(['angular', 'rxjs'], ['angular', 'tailwind', 'figma'])).toBe(33);
    expect(skillMatchPercent(['angular', 'tailwind'], ['angular', 'tailwind'])).toBe(100);
    expect(skillMatchPercent(['angular'], [])).toBeNull();
  });
});
