import { Component, computed, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApplicationStatus, humanizeLabel } from '@hirestack/shared';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../core/toast.service';
import { EmptyState, Skeleton, StatusBadge } from '../../shared/ui';

interface ApplicationRow {
  id: string;
  status: string;
  createdAt: string;
  job: { slug: string; title: string; company: { name: string } };
  events: Array<{ id: string; toStatus: string; note: string | null; createdAt: string; isPublic: boolean }>;
}

const COLUMNS = ['SUBMITTED', 'REVIEWING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED', 'WITHDRAWN'] as const;

@Component({
  selector: 'hs-tracker',
  imports: [RouterLink, StatusBadge, Skeleton, EmptyState],
  template: `
    <header class="page-head">
      <div>
        <p class="eyebrow">Pipeline</p>
        <h1>Applications</h1>
        <p class="lede">Follow every stage from submitted to hired. Accept or decline an offer here. Withdraw while it is still early.</p>
      </div>
      <a routerLink="/jobs" class="ghost">Find jobs</a>
    </header>
    @if (apps.isLoading()) {
      <hs-skeleton />
    } @else if (apps.error()) {
      <hs-empty-state title="Could not load applications" message="Sign in again, then retry." />
    } @else if (!apps.value()?.length) {
      <hs-empty-state title="No applications" message="Find a role and apply with your current resume.">
        <a routerLink="/jobs" class="button">Browse jobs</a>
      </hs-empty-state>
    } @else {
      <div class="kanban">
        @for (column of columns; track column) {
          <section class="kanban-col">
            <h2>{{ label(column) }} · {{ byStatus(column).length }}</h2>
            @for (app of byStatus(column); track app.id) {
              <article class="kanban-card">
                <a [routerLink]="['/jobs', app.job.slug]"><strong>{{ app.job.title }}</strong></a>
                <p class="muted">{{ app.job.company.name }}</p>
                <hs-status-badge [status]="app.status" />
                @if (latestNote(app); as note) {
                  <p>{{ note }}</p>
                }
                @switch (app.status) {
                  @case ('SUBMITTED') {
                    <button type="button" class="ghost" (click)="withdraw(app.id)">Withdraw</button>
                  }
                  @case ('REVIEWING') {
                    <button type="button" class="ghost" (click)="withdraw(app.id)">Withdraw</button>
                  }
                  @case ('INTERVIEW') { <p class="muted">Interview in progress</p> }
                  @case ('OFFER') {
                    <p class="muted">Offer extended</p>
                    <div class="actions">
                      <button type="button" (click)="accept(app.id)">Accept offer</button>
                      <button type="button" class="ghost" (click)="withdraw(app.id, 'decline')">Decline offer</button>
                    </div>
                  }
                  @case ('HIRED') { <p class="muted">Hired</p> }
                  @case ('REJECTED') { <p class="muted">Closed</p> }
                  @case ('WITHDRAWN') { <p class="muted">Withdrawn</p> }
                  @default { never; }
                }
              </article>
            }
          </section>
        }
      </div>
    }
  `,
})
export class TrackerPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  readonly columns = COLUMNS;
  readonly apps = httpResource<ApplicationRow[]>(() => `${environment.apiUrl}/me/applications`);
  readonly grouped = computed(() => this.apps.value() ?? []);

  byStatus(status: string) {
    return this.grouped().filter((row) => row.status === status);
  }

  label(status: string) {
    return humanizeLabel(status);
  }

  latestNote(app: ApplicationRow) {
    return [...app.events].reverse().find((event) => event.note)?.note ?? null;
  }

  async withdraw(id: string, kind: 'withdraw' | 'decline' = 'withdraw') {
    try {
      await firstValueFrom(this.http.post(`${environment.apiUrl}/applications/${id}/withdraw`, {}));
      this.apps.reload();
      this.toast.show(kind === 'decline' ? 'Offer declined' : 'Application withdrawn', 'success');
    } catch {
      this.toast.show(kind === 'decline' ? 'Could not decline this offer' : 'Cannot withdraw from this stage', 'error');
    }
  }

  async accept(id: string) {
    try {
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/applications/${id}/transition`, {
          toStatus: ApplicationStatus.HIRED,
          note: 'Candidate accepted the offer',
          isPublic: true,
        }),
      );
      this.apps.reload();
      this.toast.show('Offer accepted', 'success');
    } catch {
      this.toast.show('Could not accept that offer', 'error');
    }
  }
}
