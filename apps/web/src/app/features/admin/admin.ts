import { Component, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../core/toast.service';
import { Skeleton, StatusBadge } from '../../shared/ui';

interface Metrics {
  users: Record<string, number>;
  jobs: Record<string, number>;
  applications: Record<string, number>;
}

@Component({
  selector: 'hs-admin',
  imports: [Skeleton, StatusBadge],
  template: `
    <h1>Admin</h1>
    @if (metrics.isLoading()) { <hs-skeleton /> } @else {
      <div class="stats">
        @for (entry of entries(metrics.value()?.users); track entry[0]) {
          <article><strong>{{ entry[1] }}</strong><span>{{ entry[0] }} users</span></article>
        }
      </div>
    }
    <h2>Users</h2>
    <div class="stack">
      @for (user of users.value()?.data ?? []; track user.id) {
        <article class="card row">
          <div>
            <strong>{{ user.name }}</strong>
            <p>{{ user.email }} · {{ user.role }}</p>
            <hs-status-badge [status]="user.status" />
          </div>
          <button type="button" (click)="toggle(user.id, user.status)">
            {{ user.status === 'ACTIVE' ? 'Suspend' : 'Unsuspend' }}
          </button>
        </article>
      }
    </div>
    <h2>Reports</h2>
    <div class="stack">
      @for (report of reports.value() ?? []; track report.id) {
        <article class="card">
          <p>{{ report.reason }}</p>
          <p>{{ report.job.title }} · {{ report.status }}</p>
          <button type="button" (click)="resolve(report.id)">Resolve</button>
          <button type="button" (click)="unpublish(report.job.id)">Unpublish job</button>
        </article>
      }
    </div>
  `,
})
export class AdminPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  readonly metrics = httpResource<Metrics>(() => `${environment.apiUrl}/admin/metrics`);
  readonly users = httpResource<{ data: Array<{ id: string; name: string; email: string; role: string; status: string }> }>(
    () => `${environment.apiUrl}/admin/users`,
  );
  readonly reports = httpResource<Array<{ id: string; reason: string; status: string; job: { id: string; title: string } }>>(
    () => `${environment.apiUrl}/admin/reports`,
  );

  entries(value?: Record<string, number>) {
    return Object.entries(value ?? {});
  }

  async toggle(id: string, status: string) {
    await firstValueFrom(
      this.http.patch(`${environment.apiUrl}/admin/users/${id}`, {
        status: status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
      }),
    );
    this.users.reload();
    this.toast.show('User updated', 'success');
  }

  async resolve(id: string) {
    await firstValueFrom(this.http.patch(`${environment.apiUrl}/admin/reports/${id}`, { status: 'RESOLVED' }));
    this.reports.reload();
  }

  async unpublish(id: string) {
    await firstValueFrom(this.http.post(`${environment.apiUrl}/admin/jobs/${id}/unpublish`, {}));
    this.toast.show('Job unpublished', 'success');
  }
}
