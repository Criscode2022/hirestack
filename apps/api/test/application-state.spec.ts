import {
  ApplicationStatus,
  assertLegalTransition,
  ILLEGAL_TRANSITION,
  isLegalTransition,
} from '@hirestack/shared';

describe('application state machine', () => {
  it('allows the happy-path employer pipeline', () => {
    expect(isLegalTransition(ApplicationStatus.SUBMITTED, ApplicationStatus.REVIEWING, 'EMPLOYER')).toBe(true);
    expect(isLegalTransition(ApplicationStatus.REVIEWING, ApplicationStatus.INTERVIEW, 'EMPLOYER')).toBe(true);
    expect(isLegalTransition(ApplicationStatus.INTERVIEW, ApplicationStatus.OFFER, 'EMPLOYER')).toBe(true);
    expect(isLegalTransition(ApplicationStatus.OFFER, ApplicationStatus.HIRED, 'EMPLOYER')).toBe(true);
  });

  it('allows rejection from early stages only', () => {
    expect(isLegalTransition(ApplicationStatus.SUBMITTED, ApplicationStatus.REJECTED, 'EMPLOYER')).toBe(true);
    expect(isLegalTransition(ApplicationStatus.OFFER, ApplicationStatus.REJECTED, 'EMPLOYER')).toBe(false);
  });

  it('lets candidates withdraw only from SUBMITTED or REVIEWING', () => {
    expect(isLegalTransition(ApplicationStatus.SUBMITTED, ApplicationStatus.WITHDRAWN, 'CANDIDATE')).toBe(true);
    expect(isLegalTransition(ApplicationStatus.REVIEWING, ApplicationStatus.WITHDRAWN, 'CANDIDATE')).toBe(true);
    expect(isLegalTransition(ApplicationStatus.INTERVIEW, ApplicationStatus.WITHDRAWN, 'CANDIDATE')).toBe(false);
  });

  it('throws a typed illegal-transition error', () => {
    expect(() =>
      assertLegalTransition(ApplicationStatus.HIRED, ApplicationStatus.OFFER, 'EMPLOYER'),
    ).toThrow(expect.objectContaining({ name: ILLEGAL_TRANSITION }));
  });

  it('blocks candidate status jumps that skip the pipeline', () => {
    expect(isLegalTransition(ApplicationStatus.SUBMITTED, ApplicationStatus.HIRED, 'CANDIDATE')).toBe(false);
    expect(isLegalTransition(ApplicationStatus.REJECTED, ApplicationStatus.SUBMITTED, 'EMPLOYER')).toBe(false);
  });
});
