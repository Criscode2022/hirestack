import {
  BillingPlan,
  canFeatureMore,
  canPublishMore,
  planCatalogItem,
  remainingSlots,
  usagePercent,
  demoInvoicesForPlan,
} from '@hirestack/shared';

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

  it('turns usage into a meter percent', () => {
    expect(usagePercent(0, 10)).toBe(0);
    expect(usagePercent(5, 10)).toBe(50);
    expect(usagePercent(12, 10)).toBe(100);
    expect(usagePercent(7, null)).toBe(0);
  });

  it('issues a paid Growth invoice for demo workspaces', () => {
    const rows = demoInvoicesForPlan(BillingPlan.GROWTH, 'co_northwind');
    expect(rows).toEqual([
      expect.objectContaining({
        planName: 'Growth',
        amountUsd: 199,
        status: 'PAID',
      }),
    ]);
    expect(demoInvoicesForPlan(BillingPlan.FREE, 'co_free')).toEqual([]);
  });
});
