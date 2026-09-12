import {
  ApplicationStatus,
  assertLegalTransition,
  ILLEGAL_TRANSITION,
  isLegalTransition,
  legalTransitions,
} from '@hirestack/shared';

describe('application state machine', () => {
  it('allows the happy-path employer pipeline', () => {
    expect(isLegalTransition(ApplicationStatus.SUBMITTED, ApplicationStatus.REVIEWING, 'EMPLOYER')).toBe(true);
    expect(isLegalTransition(ApplicationStatus.REVIEWING, ApplicationStatus.INTERVIEW, 'EMPLOYER')).toBe(true);
    expect(isLegalTransition(ApplicationStatus.INTERVIEW, ApplicationStatus.OFFER, 'EMPLOYER')).toBe(true);
    expect(isLegalTransition(ApplicationStatus.OFFER, ApplicationStatus.HIRED, 'EMPLOYER')).toBe(true);
  });

  it('lets employers reject through offer, then only hire or rescind', () => {
    expect(isLegalTransition(ApplicationStatus.SUBMITTED, ApplicationStatus.REJECTED, 'EMPLOYER')).toBe(true);
    expect(isLegalTransition(ApplicationStatus.OFFER, ApplicationStatus.REJECTED, 'EMPLOYER')).toBe(true);
    expect(isLegalTransition(ApplicationStatus.HIRED, ApplicationStatus.REJECTED, 'EMPLOYER')).toBe(false);
  });

  it('lets candidates withdraw early and accept or decline an offer', () => {
    expect(isLegalTransition(ApplicationStatus.SUBMITTED, ApplicationStatus.WITHDRAWN, 'CANDIDATE')).toBe(true);
    expect(isLegalTransition(ApplicationStatus.REVIEWING, ApplicationStatus.WITHDRAWN, 'CANDIDATE')).toBe(true);
    expect(isLegalTransition(ApplicationStatus.INTERVIEW, ApplicationStatus.WITHDRAWN, 'CANDIDATE')).toBe(false);
    expect(isLegalTransition(ApplicationStatus.OFFER, ApplicationStatus.HIRED, 'CANDIDATE')).toBe(true);
    expect(isLegalTransition(ApplicationStatus.OFFER, ApplicationStatus.WITHDRAWN, 'CANDIDATE')).toBe(true);
    expect(isLegalTransition(ApplicationStatus.OFFER, ApplicationStatus.REJECTED, 'CANDIDATE')).toBe(false);
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

  it('lists legal next stages for each desk', () => {
    expect(legalTransitions(ApplicationStatus.OFFER, 'CANDIDATE')).toEqual([
      ApplicationStatus.HIRED,
      ApplicationStatus.WITHDRAWN,
    ]);
    expect(legalTransitions(ApplicationStatus.OFFER, 'EMPLOYER')).toEqual([
      ApplicationStatus.HIRED,
      ApplicationStatus.REJECTED,
    ]);
  });
});
