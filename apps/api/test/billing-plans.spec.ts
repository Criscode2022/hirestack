import { BillingPlan, canFeatureMore, canPublishMore, planCatalogItem, remainingSlots } from '@hirestack/shared';

describe('billing plans', () => {
  it('exposes sellable catalog prices', () => {
    expect(planCatalogItem(BillingPlan.FREE).monthlyUsd).toBe(0);
    expect(planCatalogItem(BillingPlan.STARTER).monthlyUsd).toBe(49);
    expect(planCatalogItem(BillingPlan.GROWTH).monthlyUsd).toBe(199);
  });

  it('caps free and starter publishing', () => {
    expect(canPublishMore(BillingPlan.FREE, 0)).toBe(true);
    expect(canPublishMore(BillingPlan.FREE, 1)).toBe(false);
    expect(canPublishMore(BillingPlan.STARTER, 9)).toBe(true);
    expect(canPublishMore(BillingPlan.STARTER, 10)).toBe(false);
    expect(canPublishMore(BillingPlan.GROWTH, 500)).toBe(true);
  });

  it('caps featured listings per plan', () => {
    expect(canFeatureMore(BillingPlan.FREE, 0)).toBe(false);
    expect(canFeatureMore(BillingPlan.STARTER, 0)).toBe(true);
    expect(canFeatureMore(BillingPlan.STARTER, 1)).toBe(false);
    expect(canFeatureMore(BillingPlan.GROWTH, 4)).toBe(true);
  });

  it('computes remaining slots', () => {
    expect(remainingSlots(1, 1)).toBe(0);
    expect(remainingSlots(null, 12)).toBeNull();
  });
});
