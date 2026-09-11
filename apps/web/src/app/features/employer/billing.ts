import { Component, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { BILLING_PLAN_CATALOG, usagePercent, type BillingInvoiceView, type BillingPlan } from '@hirestack/shared';
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
        <p class="lede">Inventory limits are enforced on publish and featured slots. Demo checkout upgrades immediately until Stripe is connected.</p>
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
    @if (pendingPlan(); as next) {
      <section class="card">
        <h2>Confirm plan change</h2>
        <p class="muted">Move this hiring desk to {{ next }}? Demo checkout is instant. Stripe replaces this step when a secret is set.</p>
        <div class="cta-row">
          <button type="button" (click)="confirmSubscribe()">Confirm {{ next }}</button>
          <button type="button" class="ghost" (click)="pendingPlan.set(null)">Cancel</button>
        </div>
      </section>
    }
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
                <td class="muted">{{ row.id.slice(0, 12) }}</td>
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
    return value.toLowerCase().replaceAll('_', ' ');
  }

  billNote() {
    return this.workspace.value()?.checkoutMode === 'stripe' ? 'Stripe will charge the card on file.' : 'Demo billing, no card charged.';
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
      this.toast.show(`Moved to ${plan}`, 'success');
    } catch {
      this.toast.show('Could not change plan', 'error');
    }
  }
}
