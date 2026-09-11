import { Component, computed, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { titleLabel, type ApplicationStatus } from '@hirestack/shared';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../core/toast.service';
import { EmptyState, Skeleton, StatusBadge } from '../../shared/ui';
import { initials } from '../../shared/time';

interface Applicant {
  id: string;
  status: ApplicationStatus;
  coverLetter: string | null;
  createdAt: string;
  candidate: {
    id?: string;
    name: string;
    headline: string | null;
    email: string;
    location?: string | null;
    userSkills?: Array<{ skill: { name: string; slug: string } }>;
  };
  resume?: { fileName: string; fileUrl: string } | null;
}

@Component({
  selector: 'hs-inbox',
  imports: [RouterLink, Skeleton, EmptyState, StatusBadge],
  template: `
    <header class="page-head">
      <div>
        <p class="eyebrow">Hiring desk</p>
        <h1>Applicant pipeline</h1>
        <p class="lede">
          @if (job.value()?.title; as title) {
            {{ title }}. Review, interview, then offer — the desk will not skip a stage.
          } @else {
            Review, interview, then offer. The desk will not skip a stage.
          }
        </p>
      </div>
      <div class="cta-row">
        @if (job.value()?.slug; as slug) {
          <a class="ghost" [routerLink]="['/jobs', slug]">Public listing</a>
        }
        <a routerLink="/employer" class="ghost">Back to jobs</a>
      </div>
    </header>
    @if (rows.isLoading()) {
      <hs-skeleton />
    } @else if (rows.error()) {
      <hs-empty-state title="Pipeline unavailable" message="This job may have moved. Refresh, or go back to the hiring desk." />
    } @else if (!rows.value()?.length) {
      <hs-empty-state title="No applicants" message="Share the public job page to start a pipeline.">
        <a routerLink="/employer" class="ghost">Back to jobs</a>
      </hs-empty-state>
    } @else {
      <div class="kanban">
        @for (column of columns; track column) {
          <section class="kanban-col">
            <h2>{{ label(column) }} · {{ byStatus(column).length }}</h2>
            @for (row of byStatus(column); track row.id) {
              <article class="kanban-card">
                <header class="person-row">
                  <span class="avatar">{{ initials(row.candidate.name) }}</span>
                  <div>
                    @if (row.candidate.id; as personId) {
                      <a [routerLink]="['/people', personId]"><strong>{{ row.candidate.name }}</strong></a>
                    } @else {
                      <strong>{{ row.candidate.name }}</strong>
                    }
                    <p class="muted">{{ row.candidate.headline }}</p>
                  </div>
                </header>
                <hs-status-badge [status]="row.status" />
                @if (row.candidate.location) {
                  <p class="muted">{{ row.candidate.location }}</p>
                }
                @if (skills(row).length) {
                  <div class="chips">
                    @for (skill of skills(row); track skill) {
                      <span class="chip">{{ skill }}</span>
                    }
                  </div>
                }
                @if (row.coverLetter) { <p>{{ row.coverLetter }}</p> }
                @if (row.resume; as cv) {
                  <p>
                    @if (cv.fileUrl) {
                      <a [href]="cv.fileUrl" target="_blank" rel="noopener noreferrer">Resume · {{ cv.fileName }}</a>
                    } @else {
                      <span class="muted">Resume · {{ cv.fileName }}</span>
                    }
                  </p>
                }
                <div class="actions">
                  @if (row.candidate.id; as personId) {
                    <button type="button" class="ghost" (click)="message(personId)">Message</button>
                  }
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
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly initials = initials;
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
  readonly job = httpResource<{ title: string; slug: string }>(() => {
    const id = this.route.snapshot.paramMap.get('id');
    return id ? `${environment.apiUrl}/me/jobs/${id}` : undefined;
  });
  readonly rows = httpResource<Applicant[]>(() => {
    const id = this.route.snapshot.paramMap.get('id');
    return id ? `${environment.apiUrl}/jobs/${id}/applications` : undefined;
  });
  readonly grouped = computed(() => this.rows.value() ?? []);

  byStatus(status: ApplicationStatus) {
    return this.grouped().filter((row) => row.status === status);
  }

  skills(row: Applicant) {
    return (row.candidate.userSkills ?? [])
      .map((item) => item.skill?.name)
      .filter((name): name is string => Boolean(name))
      .slice(0, 3);
  }

  label(status: string) {
    return titleLabel(status);
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

  async message(userId: string) {
    try {
      const conversation = await firstValueFrom(
        this.http.post<{ id: string }>(`${environment.apiUrl}/conversations`, { userId }),
      );
      await this.router.navigate(['/messages', conversation.id]);
    } catch {
      this.toast.show('Could not start a thread', 'error');
    }
  }

  async move(id: string, toStatus: ApplicationStatus) {
    try {
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/applications/${id}/transition`, {
          toStatus,
          note: `Moved to ${this.label(toStatus)}`,
          isPublic: toStatus === 'REJECTED',
        }),
      );
      this.rows.reload();
      this.toast.show(`Moved to ${this.label(toStatus)}`, 'success');
    } catch {
      this.toast.show('That move is not allowed from this stage', 'error');
    }
  }
}
