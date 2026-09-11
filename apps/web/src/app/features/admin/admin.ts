import { Component, effect, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { humanizeLabel } from '@hirestack/shared';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../core/toast.service';
import { EmptyState, Skeleton, StatusBadge } from '../../shared/ui';

interface Metrics {
  users: Record<string, number>;
  jobs: Record<string, number>;
  applications: Record<string, number>;
}

@Component({
  selector: 'hs-admin',
  imports: [Skeleton, StatusBadge, EmptyState],
  template: `
    <header class="page-head">
      <div>
        <p class="eyebrow">Trust and safety</p>
        <h1>Moderation</h1>
        <p class="lede">Suspend accounts, clear reports, and unpublish roles that should not stay live.</p>
      </div>
      <input type="search" placeholder="Search name or email" [value]="query()" (input)="query.set($any($event.target).value)" />
    </header>
    @if (metrics.isLoading()) {
      <hs-skeleton />
    } @else if (metrics.error()) {
      <hs-empty-state title="Metrics unavailable" message="Sign in again with an admin account, then retry." />
    } @else {
      <div class="stats">
        @for (entry of entries(metrics.value()?.users, roleOrder); track entry[0]) {
          <article><strong>{{ entry[1] }}</strong><span>{{ label(entry[0]) }} users</span></article>
        }
        @for (entry of entries(metrics.value()?.jobs, jobOrder); track entry[0]) {
          <article><strong>{{ entry[1] }}</strong><span>{{ label(entry[0]) }} jobs</span></article>
        }
      </div>
    }
    <h2>Users</h2>
    @if (users.isLoading()) {
      <hs-skeleton [rows]="[1, 2]" [height]="72" />
    } @else if (users.error()) {
      <hs-empty-state title="Could not load users" message="The admin API may still be starting." />
    } @else if (!users.value()?.data.length) {
      <hs-empty-state title="No users" message="Seed or register accounts, then they appear here." />
    } @else {
      <div class="stack">
        @for (user of users.value()?.data ?? []; track user.id) {
          <article class="card row">
            <div>
              <strong>{{ user.name }}</strong>
              <p class="muted">{{ user.email }}</p>
              <div class="chips">
                <span class="chip">{{ label(user.role) }}</span>
                <hs-status-badge [status]="user.status" />
              </div>
            </div>
            <button type="button" class="ghost" (click)="toggle(user.id, user.status)">
              {{ user.status === 'ACTIVE' ? 'Suspend' : 'Unsuspend' }}
            </button>
          </article>
        }
      </div>
    }
    <h2>Reports</h2>
    @if (reports.isLoading()) {
      <hs-skeleton [rows]="[1]" [height]="72" />
    } @else if (reports.error()) {
      <hs-empty-state title="Could not load reports" message="Retry in a moment." />
    } @else if (!reports.value()?.length) {
      <hs-empty-state title="No open reports" message="When a job is flagged, it lands in this queue." />
    } @else {
      <div class="stack">
        @for (report of reports.value() ?? []; track report.id) {
          <article class="card">
            <p>{{ report.reason }}</p>
            <p class="muted">{{ report.job.title }} · {{ label(report.status) }}</p>
            <div class="cta-row">
              <button type="button" class="ghost" (click)="resolve(report.id)">Resolve</button>
              <button type="button" class="ghost" (click)="unpublish(report.job.id)">Unpublish job</button>
            </div>
          </article>
        }
      </div>
    }
  `,
})
export class AdminPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  readonly query = signal('');
  readonly deferredQuery = signal('');
  readonly roleOrder = ['ADMIN', 'EMPLOYER', 'CANDIDATE'];
  readonly jobOrder = ['PUBLISHED', 'DRAFT', 'CLOSED'];
  readonly metrics = httpResource<Metrics>(() => `${environment.apiUrl}/admin/metrics`);
  readonly users = httpResource<{ data: Array<{ id: string; name: string; email: string; role: string; status: string }> }>(
    () => {
      const q = this.deferredQuery().trim();
      const params = q ? `?q=${encodeURIComponent(q)}` : '';
      return `${environment.apiUrl}/admin/users${params}`;
    },
  );
  readonly reports = httpResource<Array<{ id: string; reason: string; status: string; job: { id: string; title: string } }>>(
    () => `${environment.apiUrl}/admin/reports`,
  );

  constructor() {
    effect((onCleanup) => {
      const q = this.query();
      const handle = setTimeout(() => this.deferredQuery.set(q), 220);
      onCleanup(() => clearTimeout(handle));
    });
  }

  entries(value: Record<string, number> | undefined, order: string[]) {
    return Object.entries(value ?? {}).sort((left, right) => {
      const leftRank = order.indexOf(left[0]);
      const rightRank = order.indexOf(right[0]);
      return (leftRank === -1 ? 99 : leftRank) - (rightRank === -1 ? 99 : rightRank);
    });
  }

  label(value: string) {
    return humanizeLabel(value);
  }

  async toggle(id: string, status: string) {
    try {
      await firstValueFrom(
        this.http.patch(`${environment.apiUrl}/admin/users/${id}`, {
          status: status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
        }),
      );
      this.users.reload();
      this.metrics.reload();
      this.toast.show('User updated', 'success');
    } catch {
      this.toast.show('Could not update user', 'error');
    }
  }

  async resolve(id: string) {
    try {
      await firstValueFrom(this.http.patch(`${environment.apiUrl}/admin/reports/${id}`, { status: 'RESOLVED' }));
      this.reports.reload();
      this.toast.show('Report resolved', 'success');
    } catch {
      this.toast.show('Could not resolve report', 'error');
    }
  }

  async unpublish(id: string) {
    try {
      await firstValueFrom(this.http.post(`${environment.apiUrl}/admin/jobs/${id}/unpublish`, {}));
      this.reports.reload();
      this.metrics.reload();
      this.toast.show('Job unpublished', 'success');
    } catch {
      this.toast.show('Could not unpublish job', 'error');
    }
  }
}
