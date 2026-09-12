import { Component, computed, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApplicationStatus, humanizeLabel } from '@hirestack/shared';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../core/toast.service';
import { EmptyState, Skeleton, StatusBadge } from '../../shared/ui';

interface ApplicationRow {
  id: string;
  status: string;
  createdAt: string;
  job: {
    id: string;
    slug: string;
    title: string;
    company: { name: string; slug?: string; ownerId?: string };
  };
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
            @if (!byStatus(column).length) {
              <p class="muted col-empty">{{ emptyHint(column) }}</p>
            }
            @for (app of byStatus(column); track app.id) {
              <article class="kanban-card">
                <a [routerLink]="['/jobs', app.job.slug]"><strong>{{ app.job.title }}</strong></a>
                @if (app.job.company.slug; as slug) {
                  <p class="muted"><a [routerLink]="['/companies', slug]">{{ app.job.company.name }}</a></p>
                } @else {
                  <p class="muted">{{ app.job.company.name }}</p>
                }
                <hs-status-badge [status]="app.status" />
                @if (app.job.company.ownerId; as ownerId) {
                  <button type="button" class="ghost" [disabled]="busyId() === app.id" (click)="message(ownerId, app.job.id, app.id)">
                    Message hiring lead
                  </button>
                }
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
                    @if (upstreamMode()) {
                      <p class="form-alert">Accept and decline succeed after this API is on production. This preview still proxies the previous host.</p>
                    }
                    <div class="actions">
                      <button type="button" [disabled]="busyId() === app.id" (click)="accept(app.id)">
                        {{ busyId() === app.id ? 'Saving…' : 'Accept offer' }}
                      </button>
                      <button type="button" class="ghost" [disabled]="busyId() === app.id" (click)="withdraw(app.id, 'decline')">
                        Decline offer
                      </button>
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
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly columns = COLUMNS;
  readonly busyId = signal<string | null>(null);
  readonly apps = httpResource<ApplicationRow[]>(() => `${environment.apiUrl}/me/applications`);
  readonly health = httpResource<{ upstreamMode?: boolean }>(() => `${environment.apiUrl}/health`);
  readonly grouped = computed(() => this.apps.value() ?? []);

  upstreamMode() {
    return Boolean(this.health.value()?.upstreamMode);
  }

  byStatus(status: string) {
    return this.grouped().filter((row) => row.status === status);
  }

  label(status: string) {
    return humanizeLabel(status);
  }

  emptyHint(status: string) {
    switch (status) {
      case 'OFFER':
        return 'When a team extends an offer, accept or decline it here.';
      case 'HIRED':
        return 'Accepted offers land here.';
      case 'WITHDRAWN':
        return 'Withdrawn or declined roles land here.';
      case 'REJECTED':
        return 'Closed roles land here.';
      default:
        return `Nothing in ${this.label(status).toLowerCase()} yet.`;
    }
  }

  latestNote(app: ApplicationRow) {
    return [...app.events].reverse().find((event) => event.note)?.note ?? null;
  }

  async withdraw(id: string, kind: 'withdraw' | 'decline' = 'withdraw') {
    this.busyId.set(id);
    try {
      await firstValueFrom(this.http.post(`${environment.apiUrl}/applications/${id}/withdraw`, {}));
      this.apps.reload();
      this.toast.show(kind === 'decline' ? 'Offer declined' : 'Application withdrawn', 'success');
    } catch {
      this.toast.show(
        this.staleUpstreamMessage() ?? (kind === 'decline' ? 'Could not decline this offer' : 'Cannot withdraw from this stage'),
        'error',
      );
    } finally {
      this.busyId.set(null);
    }
  }

  async accept(id: string) {
    this.busyId.set(id);
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
      this.toast.show(this.staleUpstreamMessage() ?? 'Could not accept that offer', 'error');
    } finally {
      this.busyId.set(null);
    }
  }

  async message(userId: string, jobId: string, applicationId: string) {
    this.busyId.set(applicationId);
    try {
      const conversation = await firstValueFrom(
        this.http.post<{ id: string }>(`${environment.apiUrl}/conversations`, { userId, jobId }),
      );
      await this.router.navigate(['/messages', conversation.id]);
    } catch {
      this.toast.show('Could not open that thread', 'error');
    } finally {
      this.busyId.set(null);
    }
  }

  private staleUpstreamMessage() {
    return this.upstreamMode() ? 'Candidate offer actions need this API on production' : null;
  }
}
