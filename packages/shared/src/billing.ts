import { BillingPlan, type BillingPlan as BillingPlanId } from './enums';

export interface BillingPlanCatalogItem {
  id: BillingPlanId;
  name: string;
  tagline: string;
  monthlyUsd: number;
  publishedJobs: number | null;
  featuredJobs: number;
  highlights: string[];
  cta: string;
  popular?: boolean;
}

export const BILLING_PLAN_CATALOG: BillingPlanCatalogItem[] = [
  {
    id: BillingPlan.FREE,
    name: 'Free',
    tagline: 'Launch one role and learn the workflow.',
    monthlyUsd: 0,
    publishedJobs: 1,
    featuredJobs: 0,
    highlights: [
      '1 published job',
      'Guarded application pipeline',
      'Candidate messaging',
      'Public company page',
    ],
    cta: 'Start hiring',
  },
  {
    id: BillingPlan.STARTER,
    name: 'Starter',
    tagline: 'For teams filling a handful of seats.',
    monthlyUsd: 49,
    publishedJobs: 10,
    featuredJobs: 1,
    highlights: [
      '10 published jobs',
      '1 featured listing',
      'Pipeline inbox and search',
      'Resume history per candidate',
    ],
    cta: 'Choose Starter',
    popular: true,
  },
  {
    id: BillingPlan.GROWTH,
    name: 'Growth',
    tagline: 'Unlimited posting for an always-on hiring desk.',
    monthlyUsd: 199,
    publishedJobs: null,
    featuredJobs: 5,
    highlights: [
      'Unlimited published jobs',
      '5 featured listings',
      'Priority placement on search',
      'Featured placement and higher caps',
    ],
    cta: 'Choose Growth',
  },
];

export function planCatalogItem(plan: BillingPlanId): BillingPlanCatalogItem {
  const found = BILLING_PLAN_CATALOG.find((item) => item.id === plan);
  if (!found) {
    return BILLING_PLAN_CATALOG[0]!;
  }
  return found;
}

export function canPublishMore(plan: BillingPlanId, publishedCount: number): boolean {
  const limit = planCatalogItem(plan).publishedJobs;
  return limit == null || publishedCount < limit;
}

export function canFeatureMore(plan: BillingPlanId, featuredCount: number): boolean {
  return featuredCount < planCatalogItem(plan).featuredJobs;
}

export function remainingSlots(limit: number | null, used: number): number | null {
  if (limit == null) {
    return null;
  }
  return Math.max(0, limit - used);
}

export type BillingInvoiceView = {
  id: string;
  plan: BillingPlanId;
  planName: string;
  amountUsd: number;
  status: 'PAID' | 'OPEN' | 'VOID';
  issuedAt: string;
  periodEnd: string;
  hostedInvoiceUrl: string | null;
};

export function invoicePeriodEnd(issuedAt: string): string {
  const date = new Date(issuedAt);
  date.setUTCMonth(date.getUTCMonth() + 1);
  return date.toISOString();
}

export function demoInvoicesForPlan(
  plan: BillingPlanId,
  companyId: string,
  issuedAt = '2026-08-28T15:00:00.000Z',
): BillingInvoiceView[] {
  const item = planCatalogItem(plan);
  if (!item.monthlyUsd) {
    return [];
  }
  return [
    {
      id: `inv_demo_${companyId}`,
      plan: item.id,
      planName: item.name,
      amountUsd: item.monthlyUsd,
      status: 'PAID',
      issuedAt,
      periodEnd: invoicePeriodEnd(issuedAt),
      hostedInvoiceUrl: null,
    },
  ];
}

export function usagePercent(used: number, limit: number | null): number {
  if (limit == null) {
    return 0;
  }
  if (limit <= 0) {
    return 100;
  }
  return Math.min(100, Math.round((used / limit) * 100));
}

export type PaymentMethodView = {
  brand: string;
  last4: string | null;
  label: string;
  demo: boolean;
};

export function paymentMethodView(stripe: boolean): PaymentMethodView {
  if (stripe) {
    return { brand: 'Card', last4: null, label: 'Card on file', demo: false };
  }
  return { brand: 'Visa', last4: '4242', label: 'Demo Visa', demo: true };
}
