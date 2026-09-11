import { Component, computed, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { type ApplicationStatus } from '@hirestack/shared';
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
  imports: [RouterLink, Skeleton, EmptyState, StatusBadge],
  template: `
    <header class="page-head">
      <div>
        <p class="eyebrow">Hiring desk</p>
        <h1>Applicant pipeline</h1>
        <p class="lede">Move people only along legal transitions. Illegal jumps are rejected by the API.</p>
      </div>
      <a routerLink="/employer" class="ghost">Back to jobs</a>
    </header>
    @if (rows.isLoading()) {
      <hs-skeleton />
    } @else if (rows.error()) {
      <hs-empty-state title="Pipeline unavailable" message="This job may have moved, or the API is still starting." />
    } @else if (!rows.value()?.length) {
      <hs-empty-state title="No applicants" message="Share the public job page to start a pipeline." />
    } @else {
      <div class="kanban">
        @for (column of columns; track column) {
          <section class="kanban-col">
            <h2>{{ label(column) }} · {{ byStatus(column).length }}</h2>
            @for (row of byStatus(column); track row.id) {
              <article class="kanban-card">
                <strong>{{ row.candidate.name }}</strong>
                <p class="muted">{{ row.candidate.headline }}</p>
                <hs-status-badge [status]="row.status" />
                @if (row.coverLetter) { <p>{{ row.coverLetter }}</p> }
                <div class="actions">
                  @for (next of nextStatuses(row.status); track next) {
                    <button type="button" class="ghost" (click)="move(row.id, next)">{{ label(next) }}</button>
                  }
                </div>
              </article>
            }
          </section>
        }
      </div>
    }
  `,
})
export class InboxPage {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  readonly columns: ApplicationStatus[] = [
    'SUBMITTED',
    'REVIEWING',
    'INTERVIEW',
    'OFFER',
    'HIRED',
    'REJECTED',
    'WITHDRAWN',
  ];
  readonly status = signal('');
  readonly rows = httpResource<Applicant[]>(() => {
    const id = this.route.snapshot.paramMap.get('id');
    return `${environment.apiUrl}/jobs/${id}/applications`;
  });
  readonly grouped = computed(() => this.rows.value() ?? []);

  byStatus(status: ApplicationStatus) {
    return this.grouped().filter((row) => row.status === status);
  }

  label(status: string) {
    return status.toLowerCase().replaceAll('_', ' ');
  }

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
      this.toast.show(`Moved to ${this.label(toStatus)}`, 'success');
    } catch {
      this.toast.show('Illegal transition', 'error');
    }
  }
}
