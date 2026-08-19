import { Component, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { APPLICATION_STATUSES, type ApplicationStatus } from '@hirestack/shared';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../core/toast.service';
import { EmptyState, Skeleton, StatusBadge } from '../../shared/ui';

interface Applicant {
  id: string;
  status: ApplicationStatus;
  coverLetter: string | null;
  createdAt: string;
  candidate: { name: string; headline: string | null; email: string };
}

@Component({
  selector: 'hs-inbox',
  imports: [Skeleton, EmptyState, StatusBadge],
  template: `
    <h1>Applicant inbox</h1>
    <label>Status
      <select [value]="status()" (change)="status.set(($any($event.target).value))">
        <option value="">All</option>
        @for (item of statuses; track item) { <option [value]="item">{{ item }}</option> }
      </select>
    </label>
    @if (rows.isLoading()) {
      <hs-skeleton />
    } @else if (!rows.value()?.length) {
      <hs-empty-state title="No applicants" message="Share the public job page to start a pipeline." />
    } @else {
      <div class="stack">
        @for (row of rows.value(); track row.id) {
          <article class="card">
            <strong>{{ row.candidate.name }}</strong>
            <p>{{ row.candidate.headline }} · {{ row.candidate.email }}</p>
            <hs-status-badge [status]="row.status" />
            @if (row.coverLetter) { <p>{{ row.coverLetter }}</p> }
            <div class="actions">
              @for (next of nextStatuses(row.status); track next) {
                <button type="button" (click)="move(row.id, next)">Move to {{ next }}</button>
              }
            </div>
          </article>
        }
      </div>
    }
  `,
})
export class InboxPage {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  readonly statuses = APPLICATION_STATUSES;
  readonly status = signal('');
  readonly rows = httpResource<Applicant[]>(() => {
    const id = this.route.snapshot.paramMap.get('id');
    const status = this.status();
    return `${environment.apiUrl}/jobs/${id}/applications${status ? `?status=${status}` : ''}`;
  });

  nextStatuses(from: ApplicationStatus): ApplicationStatus[] {
    switch (from) {
      case 'SUBMITTED':
        return ['REVIEWING', 'REJECTED'];
      case 'REVIEWING':
        return ['INTERVIEW', 'REJECTED'];
      case 'INTERVIEW':
        return ['OFFER', 'REJECTED'];
      case 'OFFER':
        return ['HIRED'];
      default:
        return [];
    }
  }

  async move(id: string, toStatus: ApplicationStatus) {
    try {
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/applications/${id}/transition`, {
          toStatus,
          note: `Moved to ${toStatus}`,
          isPublic: toStatus === 'REJECTED',
        }),
      );
      this.rows.reload();
      this.toast.show(`Moved to ${toStatus}`, 'success');
    } catch {
      this.toast.show('Illegal transition', 'error');
    }
  }
}
