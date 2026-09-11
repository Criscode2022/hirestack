import { EmploymentType } from './enums';

export function isHourlyPay(employmentType?: string | null): boolean {
  return employmentType === EmploymentType.CONTRACT || employmentType === EmploymentType.FREELANCE;
}

export function formatMoney(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCompensation(
  min: number | null | undefined,
  max: number | null | undefined,
  currency = 'USD',
  employmentType?: string | null,
): string {
  if (min == null && max == null) {
    return 'Pay not listed';
  }
  const minText = min == null ? '?' : formatMoney(min, currency);
  const maxText = max == null ? '?' : formatMoney(max, currency);
  const range = `${minText}–${maxText}`;
  return isHourlyPay(employmentType) ? `${range}/hr` : range;
}
