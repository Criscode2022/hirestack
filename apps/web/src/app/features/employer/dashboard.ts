import { Component, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { titleLabel } from '@hirestack/shared';
import { environment } from '../../../environments/environment';
import { EmptyState, Skeleton, StatusBadge } from '../../shared/ui';
import { ToastService } from '../../core/toast.service';
import { PlatformService } from '../../core/platform.service';
import { AuthStore } from '../../core/auth.store';
import { readFeaturedIds, rememberFeatured } from '../../core/featured-overlay';

interface EmployerJob {
  id: string;
  slug: string;
  title: string;
  status: string;
  featured?: boolean;
  pipeline?: Record<string, number>;
  _count: { applications: number };
}

interface Dashboard {
  openJobs: number;
  newApplicantsThisWeek: number;
  hired?: number;
  pipeline: Record<string, number>;
}

interface WorkspaceBilling {
  planName: string;
  usage: { publishedJobs: number; publishedLimit: number | null; featuredJobs: number; featuredLimit: number };
}

@Component({
  selector: 'hs-employer-dashboard',
  imports: [RouterLink, Skeleton, EmptyState, StatusBadge],
  template: `
    <header class="page-head">
      <div>
        <p class="eyebrow">Hiring desk</p>
        <h1>Pipeline overview</h1>
        <p class="lede">Publish roles, feature the ones that should win search, and review people in submitted before you interview.</p>
      </div>
      <div class="cta-row">
        <a routerLink="/employer/billing" class="ghost">Billing</a>
        <a routerLink="/employer/jobs/new" class="button">Post a job</a>
      </div>
    </header>
    @if (!auth.user()?.company) {
      <hs-empty-state title="Create a company first" message="Candidates read this page before they apply. Then you can post a role.">
        <a routerLink="/employer/company" class="button">Company settings</a>
      </hs-empty-state>
    }
    @if (dash.isLoading()) {
      <hs-skeleton />
    } @else if (dash.error()) {
      <hs-empty-state title="Pipeline overview is offline" message="Jobs below still load. Refresh this page if the overview stays empty." />
    } @else {
      <div class="stats">
        <article><strong>{{ dash.value()?.openJobs ?? 0 }}</strong><span>Open jobs</span></article>
        <article><strong>{{ dash.value()?.newApplicantsThisWeek ?? 0 }}</strong><span>New this week</span></article>
        <article><strong>{{ hiredCount() }}</strong><span>Hired</span></article>
        <article>
          <strong>{{ planName() }}</strong>
          <span>
            @if (planUsage(); as u) {
              {{ u.publishedJobs }}/{{ u.publishedLimit ?? '∞' }} published
            } @else {
              Checking published limits…
            }
          </span>
        </article>
      </div>
      <div class="chips">
        @for (entry of pipeline(); track entry[0]) {
            <span class="chip stage">{{ label(entry[0]) }} · {{ entry[1] }}</span>
        }
      </div>
      <section class="card desk-next">
        <h2>Hiring setup</h2>
        <ul class="check-list">
          <li [class.done]="!!auth.user()?.company">Company page live</li>
          <li [class.done]="(jobs.value()?.length ?? 0) > 0">At least one role on the desk</li>
          <li [class.done]="submittedCount() > 0">{{ submittedCount() }} waiting in submitted</li>
        </ul>
        <div class="cta-row">
          @if (!auth.user()?.company) {
            <a routerLink="/employer/company" class="button">Company settings</a>
          } @else if (!(jobs.value()?.length ?? 0)) {
            <a routerLink="/employer/jobs/new" class="button">Post a job</a>
          } @else if (!(submittedCount() > 0 && inboxLink())) {
            <a routerLink="/employer/jobs/new" class="ghost">Post another role</a>
          }
          <a routerLink="/employer/billing" class="ghost">Billing</a>
        </div>
      </section>
      @if (submittedCount() > 0 && inboxLink(); as inbox) {
        <section class="card review-call">
          <h2>{{ submittedCount() }} waiting in submitted</h2>
          <p class="muted">Review, interview, then offer. The desk will not skip a stage.</p>
          <a class="button" [routerLink]="inbox">Review applicants</a>
        </section>
      }
    }
    <h2>Your jobs</h2>
    @if (jobs.isLoading()) {
      <hs-skeleton />
    } @else if (jobs.error()) {
      <hs-empty-state title="Could not load jobs" message="Sign in again, then retry." />
    } @else if (!jobs.value()?.length) {
      <hs-empty-state title="No jobs yet" message="Create a company, then post your first role.">
        <a routerLink="/employer/company" class="button">Company settings</a>
      </hs-empty-state>
    } @else {
      <div class="stack">
        @if (offerJobs().length) {
          <section class="card review-call offer-call">
            <h2>{{ offersOut() === 1 ? '1 offer waiting on a candidate' : offersOut() + ' offers waiting on candidates' }}</h2>
            <p class="muted">They accept or decline from their desk. Open the pipeline to message or rescind.</p>
            @for (job of offerJobs(); track job.id) {
              <article class="offer-action">
                <a [routerLink]="['/employer/jobs', job.id, 'inbox']"><strong>{{ job.title }}</strong></a>
                <p class="muted">{{ job.pipeline?.['OFFER'] }} open {{ (job.pipeline?.['OFFER'] ?? 0) === 1 ? 'offer' : 'offers' }}</p>
                <a class="button" [routerLink]="['/employer/jobs', job.id, 'inbox']">Open pipeline</a>
              </article>
            }
          </section>
        }
        @for (job of jobs.value(); track job.id) {
          <article class="card job-row">
            <div class="job-row-main">
              <div class="job-row-title">
                <a [routerLink]="['/jobs', job.slug]"><strong>{{ job.title }}</strong></a>
                <hs-status-badge [status]="job.status" />
                @if (isFeatured(job)) { <span class="chip open">Featured</span> }
              </div>
              <p class="muted">{{ job._count.applications }} {{ job._count.applications === 1 ? 'applicant' : 'applicants' }}</p>
              @if (jobPipeline(job).length) {
                <div class="chips job-pipeline">
                  @for (entry of jobPipeline(job); track entry[0]) {
                    <span class="chip stage">{{ label(entry[0]) }} · {{ entry[1] }}</span>
                  }
                </div>
              }
            </div>
            <div class="job-row-actions">
              <a class="ghost" [routerLink]="['/employer/jobs', job.id, 'inbox']">Pipeline</a>
              <a class="ghost" [routerLink]="['/employer/jobs', job.id, 'edit']">Edit</a>
              <button type="button" class="ghost" (click)="toggleFeature(job)">
                {{ isFeatured(job) ? 'Unfeature' : 'Feature' }}
              </button>
            </div>
          </article>
        }
      </div>
    }
  `,
})
export class EmployerDashboardPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly platform = inject(PlatformService);
  readonly auth = inject(AuthStore);
  readonly dash = httpResource<Dashboard>(() => `${environment.apiUrl}/me/employer-dashboard`);
  readonly jobs = httpResource<EmployerJob[]>(() => `${environment.apiUrl}/me/jobs`);
  readonly billing = httpResource<WorkspaceBilling>(() => `${environment.apiUrl}/billing/workspace`);
  readonly featuredIds = signal(readFeaturedIds());

  readonly label = titleLabel;

  planName() {
    return this.billing.value()?.planName ?? this.platform.workspacePlan()?.planName ?? '…';
  }

  planUsage() {
    return this.billing.value()?.usage ?? this.platform.workspacePlan()?.usage ?? null;
  }

  hiredCount() {
    const dash = this.dash.value();
    return dash?.pipeline?.['HIRED'] ?? dash?.hired ?? 0;
  }

  submittedCount() {
    return this.dash.value()?.pipeline?.['SUBMITTED'] ?? 0;
  }

  offerJobs() {
    return (this.jobs.value() ?? []).filter((job) => (job.pipeline?.['OFFER'] ?? 0) > 0);
  }

  offersOut() {
    return this.offerJobs().reduce((sum, job) => sum + (job.pipeline?.['OFFER'] ?? 0), 0);
  }

  inboxLink() {
    const job = (this.jobs.value() ?? []).find((row) => row._count.applications > 0);
    return job ? ['/employer/jobs', job.id, 'inbox'] : null;
  }

  pipeline() {
    return Object.entries(this.dash.value()?.pipeline ?? {});
  }

  jobPipeline(job: EmployerJob) {
    const counts = job.pipeline ?? {};
    return (['SUBMITTED', 'REVIEWING', 'INTERVIEW', 'OFFER', 'HIRED'] as const)
      .map((status) => [status, counts[status] ?? 0] as const)
      .filter(([, count]) => count > 0);
  }

  isFeatured(job: EmployerJob) {
    return Boolean(job.featured) || this.featuredIds().includes(job.id);
  }

  async toggleFeature(job: EmployerJob) {
    const featured = !this.isFeatured(job);
    try {
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/jobs/${job.id}/feature`, { featured }),
      );
      rememberFeatured(job.id, featured);
      this.featuredIds.set(readFeaturedIds());
      this.jobs.reload();
      this.billing.reload();
      void this.platform.refreshWorkspace();
      this.toast.show(featured ? 'Featured this role' : 'Removed from featured', 'success');
    } catch {
      this.toast.show('Upgrade to feature more listings', 'error');
    }
  }
}
