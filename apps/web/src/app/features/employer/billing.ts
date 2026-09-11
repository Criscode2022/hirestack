import { Component, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { BILLING_PLAN_CATALOG, type BillingPlan } from '@hirestack/shared';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../core/toast.service';
import { Skeleton } from '../../shared/ui';

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
  imports: [RouterLink, Skeleton],
  template: `
    <header class="page-head">
      <div>
        <p class="eyebrow">Billing</p>
        <h1>Workspace plan</h1>
        <p class="lede">Inventory limits are enforced on publish and featured slots. Demo checkout upgrades immediately until Stripe is connected.</p>
      </div>
      <a routerLink="/pricing" class="ghost">Compare plans</a>
    </header>
    @if (workspace.isLoading()) {
      <hs-skeleton />
    } @else if (workspace.error()) {
      <p class="muted">Workspace usage appears when this host runs the billing API. Plans below still apply, and you can keep hiring.</p>
      <a routerLink="/employer/company" class="ghost">Company settings</a>
    } @else {
      <div class="stats">
        <article>
          <strong>{{ workspace.value()?.planName }}</strong>
          <span>{{ workspace.value()?.checkoutMode === 'stripe' ? 'Stripe checkout' : 'Demo billing' }}</span>
        </article>
        <article>
          <strong>{{ workspace.value()?.usage.publishedJobs }}/{{ workspace.value()?.usage.publishedLimit ?? '∞' }}</strong>
          <span>Published jobs</span>
        </article>
        <article>
          <strong>{{ workspace.value()?.usage.featuredJobs }}/{{ workspace.value()?.usage.featuredLimit }}</strong>
          <span>Featured slots</span>
        </article>
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
          <button type="button" [disabled]="plan.id === workspace.value()?.plan" (click)="subscribe(plan.id)">
            {{ plan.id === workspace.value()?.plan ? 'Current plan' : plan.cta }}
          </button>
        </article>
      }
    </div>
  `,
})
export class BillingPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  readonly plans = BILLING_PLAN_CATALOG;
  readonly workspace = httpResource<WorkspaceBilling>(() => `${environment.apiUrl}/billing/workspace`);

  async subscribe(plan: BillingPlan) {
    try {
      await firstValueFrom(this.http.post(`${environment.apiUrl}/billing/subscribe`, { plan }));
      this.workspace.reload();
      this.toast.show(`Moved to ${plan}`, 'success');
    } catch {
      this.toast.show('Could not change plan', 'error');
    }
  }
}
