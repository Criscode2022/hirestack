import { BillingPlan } from '@hirestack/shared';
import {
  PLAN_COOKIE,
  clearPlanOverlay,
  parsePlanCookie,
  parsePlanValue,
  resolvePlanOverlay,
  serializePlanCookie,
  setPlanOverlay,
} from '../src/common/plan-overlay';

describe('plan overlay', () => {
  afterEach(() => {
    clearPlanOverlay();
  });

  it('accepts catalog plans and rejects junk', () => {
    expect(parsePlanValue('starter')).toBe(BillingPlan.STARTER);
    expect(parsePlanValue('GROWTH')).toBe(BillingPlan.GROWTH);
    expect(parsePlanValue('enterprise')).toBeNull();
  });

  it('reads the demo checkout cookie and serializes a new one', () => {
    expect(parsePlanCookie(`${PLAN_COOKIE}=STARTER; Path=/`)).toBe(BillingPlan.STARTER);
    expect(serializePlanCookie(BillingPlan.FREE)).toContain(`${PLAN_COOKIE}=FREE`);
  });

  it('prefers an in-memory plan for the hiring desk owner', () => {
    setPlanOverlay('user_nora', BillingPlan.STARTER);
    expect(resolvePlanOverlay('user_nora', `${PLAN_COOKIE}=GROWTH`, 'FREE')).toBe(BillingPlan.STARTER);
    expect(resolvePlanOverlay('user_other', `${PLAN_COOKIE}=FREE`)).toBe(BillingPlan.FREE);
  });
});
