import {
  BillingPlan,
  canFeatureMore,
  canPublishMore,
  planCatalogItem,
  remainingSlots,
  usagePercent,
  demoInvoicesForPlan,
  invoicePeriodEnd,
  paymentMethodView,
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
        periodEnd: '2026-09-28T15:00:00.000Z',
      }),
    ]);
    expect(demoInvoicesForPlan(BillingPlan.FREE, 'co_free')).toEqual([]);
    expect(invoicePeriodEnd('2026-08-28T15:00:00.000Z')).toBe('2026-09-28T15:00:00.000Z');
  });

  it('sells Growth on inventory, not Stripe scaffolding', () => {
    expect(planCatalogItem(BillingPlan.GROWTH).highlights).toContain('Featured placement and higher caps');
    expect(planCatalogItem(BillingPlan.GROWTH).highlights).not.toContain('Ready for Stripe checkout');
    expect(planCatalogItem(BillingPlan.GROWTH).tagline).toMatch(/always-on hiring team/i);
    expect(planCatalogItem(BillingPlan.GROWTH).tagline).not.toMatch(/desk/i);
  });

  it('names the free pipeline in buyer language', () => {
    expect(planCatalogItem(BillingPlan.FREE).highlights).toContain('Guarded application pipeline');
    expect(planCatalogItem(BillingPlan.FREE).highlights).not.toContain('Legal application pipeline');
  });

  it('shows a demo card until Stripe is connected', () => {
    expect(paymentMethodView(false)).toEqual({
      brand: 'Visa',
      last4: '4242',
      label: 'Demo Visa',
      demo: true,
    });
    expect(paymentMethodView(true)).toEqual({
      brand: 'Card',
      last4: null,
      label: 'Card on file',
      demo: false,
    });
  });
});
