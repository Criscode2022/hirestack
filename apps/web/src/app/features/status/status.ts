import { Component } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { EmptyState, Skeleton } from '../../shared/ui';

interface Health {
  ok: boolean;
  db: boolean;
}

interface Plans {
  plans: Array<{ id: string }>;
}

@Component({
  selector: 'hs-status',
  imports: [RouterLink, Skeleton, EmptyState],
  template: `
    <header class="page-head">
      <div>
        <p class="eyebrow">Status</p>
        <h1>System status</h1>
        <p class="lede">API, database, and billing catalog for this host.</p>
      </div>
      <a routerLink="/pricing" class="ghost">Pricing</a>
    </header>
    @if (health.isLoading() || plans.isLoading()) {
      <hs-skeleton />
    } @else if (health.error()) {
      <hs-empty-state title="API is unreachable" message="The web app is up, but /api did not answer. Retry in a moment." />
    } @else {
      <div class="stats">
        <article>
          <strong>{{ health.value()?.ok ? 'Up' : 'Down' }}</strong>
          <span>API</span>
        </article>
        <article>
          <strong>{{ health.value()?.db ? 'Connected' : 'Offline' }}</strong>
          <span>Database</span>
        </article>
        <article>
          <strong>{{ planCount() }}</strong>
          <span>Billing plans</span>
        </article>
      </div>
      @if (plans.error() || !plans.value()?.plans.length) {
        <hs-empty-state
          title="Billing catalog is unavailable"
          message="Plans appear when this host can reach Free, Starter, and Growth."
        />
      } @else {
        <p class="muted">Free, Starter, and Growth are reachable from this host.</p>
      }
    }
  `,
})
export class StatusPage {
  readonly health = httpResource<Health>(() => `${environment.apiUrl}/health`);
  readonly plans = httpResource<Plans>(() => `${environment.apiUrl}/billing/plans`);

  planCount() {
    const count = this.plans.value()?.plans.length;
    return count ? String(count) : '—';
  }
}
