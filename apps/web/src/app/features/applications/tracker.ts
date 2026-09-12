import { Component, computed, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApplicationStatus, formatCompensation, titleLabel } from '@hirestack/shared';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../core/toast.service';
import { EmptyState, Skeleton, StatusBadge } from '../../shared/ui';
import { canToggleClosedColumns, visibleKanbanColumns } from '../../shared/kanban-columns';

interface ApplicationRow {
  id: string;
  status: string;
  createdAt: string;
  job: {
    id: string;
    slug: string;
    title: string;
    salaryMin?: number | null;
    salaryMax?: number | null;
    currency?: string;
    employmentType?: string;
    location?: string | null;
    workplace?: string;
    company: { name: string; slug?: string; ownerId?: string; logoUrl?: string | null };
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
      <div class="cta-row">
        @if (canToggleClosed()) {
          <button type="button" class="ghost" (click)="showClosed.set(!showClosed())">
            {{ showClosed() ? 'Hide closed' : 'Show closed' }}<span class="sr-only"> stages</span>
          </button>
        }
        <a routerLink="/jobs" class="ghost">Find jobs</a>
      </div>
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
      @if (offers().length) {
        <section class="card review-call offer-call">
          <h2>{{ offers().length === 1 ? '1 offer to answer' : offers().length + ' offers to answer' }}</h2>
          <p class="muted">Accept or decline here. You do not have to hunt through the board.</p>
          @for (app of offers(); track app.id) {
            <article class="offer-action">
              <header class="person-row">
                @if (app.job.company.logoUrl; as logo) {
                  <img class="logo-mark" [src]="logo" [alt]="app.job.company.name" width="32" height="32" />
                }
                <div>
                  <a [routerLink]="['/jobs', app.job.slug]"><strong>{{ app.job.title }}</strong></a>
                  @if (app.job.company.slug; as slug) {
                    <p class="muted"><a [routerLink]="['/companies', slug]">{{ app.job.company.name }}</a></p>
                  } @else {
                    <p class="muted">{{ app.job.company.name }}</p>
                  }
                </div>
              </header>
              <p class="salary">{{ pay(app) }}</p>
              @if (latestNote(app); as note) {
                <p>{{ note }}</p>
              }
              <div class="actions">
                <button type="button" [disabled]="busyId() === app.id" (click)="accept(app.id)">
                  {{ busyId() === app.id ? 'Saving…' : 'Accept offer' }}
                </button>
                <button type="button" class="ghost" [disabled]="busyId() === app.id" (click)="withdraw(app.id, 'decline')">
                  Decline offer
                </button>
                @if (app.job.company.ownerId; as ownerId) {
                  <a class="ghost" [routerLink]="['/people', ownerId]">View hiring lead</a>
                  <button type="button" class="ghost" [disabled]="busyId() === app.id" (click)="message(ownerId, app.job.id, app.id)">
                    Message hiring lead
                  </button>
                }
              </div>
            </article>
          }
        </section>
      }
      <div class="kanban">
        @for (column of visibleColumns(); track column) {
          <section class="kanban-col" [attr.data-status]="column">
            <h2>{{ label(column) }} · {{ byStatus(column).length }}</h2>
            @if (!byStatus(column).length) {
              <p class="muted col-empty">{{ emptyHint(column) }}</p>
            }
            @for (app of byStatus(column); track app.id) {
              <article class="kanban-card">
                <header class="person-row">
                  @if (app.job.company.logoUrl; as logo) {
                    <img class="logo-mark" [src]="logo" [alt]="app.job.company.name" width="32" height="32" />
                  }
                  <div>
                    <a [routerLink]="['/jobs', app.job.slug]"><strong>{{ app.job.title }}</strong></a>
                    @if (app.job.company.slug; as slug) {
                      <p class="muted"><a [routerLink]="['/companies', slug]">{{ app.job.company.name }}</a></p>
                    } @else {
                      <p class="muted">{{ app.job.company.name }}</p>
                    }
                  </div>
                </header>
                <p class="salary">{{ pay(app) }}</p>
                @if (place(app); as loc) {
                  <p class="muted">{{ loc }}</p>
                }
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
                  @case ('INTERVIEW') { <p class="muted">Interview in progress. Message the hiring lead if you need times.</p> }
                  @case ('OFFER') {
                    <p class="muted">Offer extended</p>
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
                @if (app.job.company.ownerId; as ownerId) {
                  <div class="actions">
                    <a class="ghost" [routerLink]="['/people', ownerId]">View hiring lead</a>
                    <button type="button" class="ghost" [disabled]="busyId() === app.id" (click)="message(ownerId, app.job.id, app.id)">
                      Message hiring lead
                    </button>
                  </div>
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
  readonly showClosed = signal(false);
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

  visibleColumns() {
    return visibleKanbanColumns(this.columns, (column) => this.byStatus(column).length, this.showClosed());
  }

  canToggleClosed() {
    return canToggleClosedColumns(this.columns, (column) => this.byStatus(column).length);
  }

  offers() {
    return this.byStatus('OFFER');
  }

  label(status: string) {
    return titleLabel(status);
  }

  pay(app: ApplicationRow) {
    return formatCompensation(app.job.salaryMin, app.job.salaryMax, app.job.currency ?? 'USD', app.job.employmentType);
  }

  place(app: ApplicationRow) {
    if (app.job.location) {
      return app.job.location;
    }
    return app.job.workplace === 'REMOTE' ? 'Remote' : null;
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
