import { EmploymentType, formatCompensation, payBandPercent } from '@hirestack/shared';

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

  it('scales salary bars against the highest published range', () => {
    expect(payBandPercent(null, 200000)).toBe(0);
    expect(payBandPercent(100000, 200000)).toBe(50);
    expect(payBandPercent(200000, 200000)).toBe(100);
    expect(payBandPercent(1000, 200000)).toBe(8);
  });
});
