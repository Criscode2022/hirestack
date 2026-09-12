import { ApplicationStatus } from './enums';

export const ILLEGAL_TRANSITION = 'ILLEGAL_TRANSITION';

export const EMPLOYER_TRANSITIONS: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  SUBMITTED: [ApplicationStatus.REVIEWING, ApplicationStatus.REJECTED],
  REVIEWING: [ApplicationStatus.INTERVIEW, ApplicationStatus.REJECTED],
  INTERVIEW: [ApplicationStatus.OFFER, ApplicationStatus.REJECTED],
  OFFER: [ApplicationStatus.HIRED, ApplicationStatus.REJECTED],
  HIRED: [],
  REJECTED: [],
  WITHDRAWN: [],
};

export const CANDIDATE_TRANSITIONS: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  SUBMITTED: [ApplicationStatus.WITHDRAWN],
  REVIEWING: [ApplicationStatus.WITHDRAWN],
  INTERVIEW: [],
  OFFER: [ApplicationStatus.HIRED, ApplicationStatus.WITHDRAWN],
  HIRED: [],
  REJECTED: [],
  WITHDRAWN: [],
};

export type TransitionActor = 'EMPLOYER' | 'CANDIDATE' | 'ADMIN';

export function isLegalTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
  actor: TransitionActor,
): boolean {
  if (from === to) {
    return false;
  }
  if (actor === 'CANDIDATE') {
    return CANDIDATE_TRANSITIONS[from].includes(to);
  }
  return EMPLOYER_TRANSITIONS[from].includes(to);
}

export function legalTransitions(
  from: ApplicationStatus,
  actor: TransitionActor,
): readonly ApplicationStatus[] {
  if (actor === 'CANDIDATE') {
    return CANDIDATE_TRANSITIONS[from];
  }
  return EMPLOYER_TRANSITIONS[from];
}

export function assertLegalTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
  actor: TransitionActor,
): void {
  if (!isLegalTransition(from, to, actor)) {
    const error = new Error(
      `Cannot move application from ${from} to ${to} as ${actor.toLowerCase()}`,
    );
    error.name = ILLEGAL_TRANSITION;
    throw error;
  }
}
