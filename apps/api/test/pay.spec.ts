import { EmploymentType, formatCompensation } from '@hirestack/shared';

describe('compensation copy', () => {
  it('labels salaried ranges without an hourly suffix', () => {
    expect(formatCompensation(160000, 200000, 'USD', EmploymentType.FULL_TIME)).toBe(
      '$160,000–$200,000',
    );
  });

  it('labels contract and freelance rates as hourly', () => {
    expect(formatCompensation(120, 180, 'USD', EmploymentType.CONTRACT)).toBe('$120–$180/hr');
    expect(formatCompensation(90, 140, 'USD', EmploymentType.FREELANCE)).toBe('$90–$140/hr');
  });

  it('falls back when no numbers exist', () => {
    expect(formatCompensation(null, null)).toBe('Pay not listed');
  });
});
