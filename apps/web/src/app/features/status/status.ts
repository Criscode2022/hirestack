import { Component, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { EmptyState, Skeleton } from '../../shared/ui';

interface Health {
  ok: boolean;
  db: boolean;
  hasBlob?: boolean;
  hasStripe?: boolean;
  upstreamMode?: boolean;
  gitSha?: string;
  service?: string;
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
        <p class="lede">API, database, uploads, and billing catalog for this host.</p>
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
          <strong>{{ health.value()?.hasBlob ? 'Ready' : 'Not configured' }}</strong>
          <span>Uploads</span>
        </article>
        <article>
          <strong>{{ planCount() }}</strong>
          <span>Billing plans</span>
        </article>
        <article>
          <strong>{{ health.value()?.hasStripe ? 'Stripe' : 'Demo' }}</strong>
          <span>Checkout</span>
        </article>
      </div>
      <p class="muted">{{ hostNote() }}</p>
      @if (health.value()?.upstreamMode) {
        <p class="form-alert">Some writes on this preview still go through an older API. Candidate offer accept is delayed until this host uses the current API.</p>
      }
      @if (health.value()?.gitSha; as sha) {
        <p class="muted">Build {{ sha.slice(0, 7) }}</p>
      }
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
  private readonly platformId = inject(PLATFORM_ID);
  readonly health = httpResource<Health>(() => `${environment.apiUrl}/health`);
  readonly plans = httpResource<Plans>(() => `${environment.apiUrl}/billing/plans`);

  planCount() {
    const count = this.plans.value()?.plans.length;
    return count ? String(count) : '—';
  }

  hostNote() {
    if (!isPlatformBrowser(this.platformId)) {
      return 'Checking this host.';
    }
    const host = window.location.hostname;
    const catalog = Boolean(this.plans.value()?.plans.length);
    if (host === 'hirestack-web.vercel.app') {
      return catalog
        ? 'Production is serving this build.'
        : 'Uploads, billing, and checkout on this host still follow the previous build.';
    }
    if (host === 'hirestack-angular-web.vercel.app') {
      return catalog
        ? 'This Git production alias is serving this build.'
        : 'This Git production alias still points at an older build.';
    }
    if (host.includes('localhost') || host === '127.0.0.1') {
      return this.health.value()?.hasBlob
        ? 'Local development. Database, uploads, and checkout follow this machine’s env.'
        : 'Local development. Resume and logo uploads wait until file storage is connected.';
    }
    return 'Preview host. Documented production is hirestack-web.vercel.app.';
  }
}
