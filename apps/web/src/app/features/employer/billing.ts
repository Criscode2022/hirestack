import { Component, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { BILLING_PLAN_CATALOG, humanizeLabel, paymentMethodView, planCatalogItem, usagePercent, type BillingInvoiceView, type BillingPlan, type PaymentMethodView } from '@hirestack/shared';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../core/toast.service';
import { PlatformService } from '../../core/platform.service';
import { rememberPlan } from '../../core/plan-overlay';
import { EmptyState, Skeleton } from '../../shared/ui';

interface WorkspaceBilling {
  plan: BillingPlan;
  planName: string;
  monthlyUsd: number;
  checkoutMode: string;
  paymentMethod?: PaymentMethodView;
  usage: {
    publishedJobs: number;
    publishedLimit: number | null;
    featuredJobs: number;
    featuredLimit: number;
  };
}

@Component({
  selector: 'hs-billing',
  imports: [RouterLink, Skeleton, EmptyState],
  styles: [':host { display: block; }'],
  template: `
    <header class="page-head">
      <div>
        <p class="eyebrow">Billing</p>
        <h1>Workspace plan</h1>
        <p class="lede">Inventory limits are enforced on publish and featured slots. Test-mode checkout upgrades immediately until Stripe is connected.</p>
        @if (invoices.value()?.invoices[0]; as latest) {
          <p class="muted">Next invoice {{ issued(latest.periodEnd) }} · {{ billNote() }}</p>
        }
      </div>
      <a routerLink="/pricing" class="ghost">Compare plans</a>
    </header>
    @if (workspace.isLoading()) {
      <hs-skeleton />
    } @else if (workspace.error()) {
      <hs-empty-state title="Workspace billing is offline" message="Plans below still apply. Usage meters appear when this host runs the billing API.">
        <a routerLink="/employer/company" class="ghost">Company settings</a>
      </hs-empty-state>
    } @else if (workspace.value(); as bill) {
      <div class="stack">
        <div class="stats">
          <article>
            <strong>{{ bill.planName }}</strong>
            <span>{{ bill.checkoutMode === 'stripe' ? 'Stripe checkout' : 'Demo billing' }}</span>
          </article>
          <article>
            <strong>{{ bill.usage.publishedJobs }}/{{ bill.usage.publishedLimit ?? '∞' }}</strong>
            <span>Published jobs</span>
          </article>
          <article>
            <strong>{{ bill.usage.featuredJobs }}/{{ bill.usage.featuredLimit }}</strong>
            <span>Featured slots</span>
          </article>
        </div>
        <div class="desk-grid">
          <section class="card">
            <h2>Published inventory</h2>
            @if (bill.usage.publishedLimit == null) {
              <p class="muted">Unlimited live roles on this plan.</p>
              <div class="meter"><i style="width:12%"></i></div>
            } @else {
              <div class="usage-meter">
                <span>{{ bill.usage.publishedJobs }} of {{ bill.usage.publishedLimit }} used</span>
                <div class="meter"><i [style.width.%]="usagePercent(bill.usage.publishedJobs, bill.usage.publishedLimit)"></i></div>
              </div>
            }
          </section>
          <section class="card">
            <h2>Featured placement</h2>
            <div class="usage-meter">
              <span>{{ bill.usage.featuredJobs }} of {{ bill.usage.featuredLimit }} used</span>
              <div class="meter"><i [style.width.%]="usagePercent(bill.usage.featuredJobs, bill.usage.featuredLimit)"></i></div>
            </div>
          </section>
        </div>
      </div>
    }
    <div class="pricing-grid">
      @for (plan of plans; track plan.id) {
        <article class="price-card" [class.popular]="plan.id === workspace.value()?.plan">
          <h2>{{ plan.name }}</h2>
          <p class="amount">{{ plan.monthlyUsd ? '$' + plan.monthlyUsd : '$0' }}<span>/mo</span></p>
          <ul>
            @for (item of plan.highlights; track item) { <li>{{ item }}</li> }
          </ul>
          <button type="button" [disabled]="plan.id === workspace.value()?.plan" (click)="requestSubscribe(plan.id)">
            {{ plan.id === workspace.value()?.plan ? 'Current plan' : plan.cta }}
          </button>
        </article>
      }
    </div>
    @if (pendingItem(); as next) {
      <section class="card checkout-sheet" aria-label="Checkout">
        <p class="eyebrow">Checkout</p>
        <h2>Pay {{ next.name }}</h2>
        <p class="amount">{{ next.monthlyUsd ? '$' + next.monthlyUsd : '$0' }}<span>/mo</span></p>
        <p class="muted">Demo card. No charge until Stripe is connected.</p>
        <div class="card-on-file demo">
          <span class="card-brand">Visa</span>
          <strong>•••• 4242</strong>
          <span>12 / 28 · Nora Chen</span>
        </div>
        <div class="cta-row">
          <button type="button" (click)="confirmSubscribe()">
            {{ next.monthlyUsd ? 'Pay $' + next.monthlyUsd : 'Switch to Free' }}
          </button>
          <button type="button" class="ghost" (click)="pendingPlan.set(null)">Cancel</button>
        </div>
      </section>
    }
    <section class="card pay-method">
      <h2>Payment method</h2>
      @if (pay(); as card) {
        <div class="card-on-file" [class.demo]="card.demo">
          <span class="card-brand">{{ card.brand }}</span>
          <strong>{{ card.last4 ? '•••• ' + card.last4 : card.label }}</strong>
          <span>{{ card.label }}</span>
        </div>
      }
      @if (workspace.value()?.checkoutMode === 'stripe') {
        <p class="muted">Cards are processed by Stripe. The invoices below are receipts for this workspace.</p>
      } @else {
        <p class="muted">Demo checkout is on. No card is charged. Connect Stripe when you want live billing and receipts.</p>
      }
    </section>
    <section class="card">
      <header class="section-head">
        <div>
          <p class="eyebrow">Revenue</p>
          <h2>Invoices</h2>
        </div>
      </header>
      @if (invoices.isLoading()) {
        <hs-skeleton [rows]="[1]" [height]="64" />
      } @else if (!invoices.value()?.invoices.length) {
        <hs-empty-state
          title="No invoices yet"
          [message]="invoices.value()?.message ?? 'Connect Stripe to collect cards and issue invoices.'"
        />
      } @else {
        <table class="invoice-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Receipt</th>
              <th>Plan</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Renews</th>
            </tr>
          </thead>
          <tbody>
            @for (row of invoices.value()?.invoices ?? []; track row.id) {
              <tr>
                <td>{{ issued(row.issuedAt) }}</td>
                <td>
                  @if (row.hostedInvoiceUrl) {
                    <a [href]="row.hostedInvoiceUrl" target="_blank" rel="noopener noreferrer">Download</a>
                  } @else {
                    <span class="muted">{{ row.id.slice(0, 12) }}</span>
                  }
                </td>
                <td>{{ row.planName }}</td>
                <td>{{ '$' + row.amountUsd }}</td>
                <td><span class="chip open">{{ label(row.status) }}</span></td>
                <td>{{ issued(row.periodEnd) }}</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </section>
  `,
})
export class BillingPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly platform = inject(PlatformService);
  readonly plans = BILLING_PLAN_CATALOG;
  readonly usagePercent = usagePercent;
  readonly workspace = httpResource<WorkspaceBilling>(() => `${environment.apiUrl}/billing/workspace`);
  readonly invoices = httpResource<{ message: string | null; invoices: BillingInvoiceView[] }>(
    () => `${environment.apiUrl}/billing/invoices`,
  );
  readonly pendingPlan = signal<BillingPlan | null>(null);

  issued(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  label(value: string) {
    return humanizeLabel(value);
  }

  billNote() {
    return this.workspace.value()?.checkoutMode === 'stripe' ? 'Stripe will charge the card on file.' : 'Demo billing, no card charged.';
  }

  pay() {
    const bill = this.workspace.value();
    if (!bill) {
      return null;
    }
    return bill.paymentMethod ?? paymentMethodView(bill.checkoutMode === 'stripe');
  }

  pendingItem() {
    const plan = this.pendingPlan();
    return plan ? planCatalogItem(plan) : null;
  }

  requestSubscribe(plan: BillingPlan) {
    if (plan === this.workspace.value()?.plan) {
      return;
    }
    this.pendingPlan.set(plan);
  }

  async confirmSubscribe() {
    const plan = this.pendingPlan();
    if (!plan) {
      return;
    }
    this.pendingPlan.set(null);
    await this.subscribe(plan);
  }

  async subscribe(plan: BillingPlan) {
    try {
      await firstValueFrom(this.http.post(`${environment.apiUrl}/billing/subscribe`, { plan }));
      rememberPlan(plan);
      this.workspace.reload();
      this.invoices.reload();
      void this.platform.refreshWorkspace();
      this.toast.show(`Moved to ${planCatalogItem(plan).name}`, 'success');
    } catch {
      this.toast.show('Could not change plan', 'error');
    }
  }
}
