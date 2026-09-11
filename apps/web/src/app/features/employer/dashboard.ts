import { Component, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
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
        <p class="lede">Publish roles, feature the ones that should win search, and keep applicants on legal rails.</p>
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
    } @else {
      <div class="stats">
        <article><strong>{{ dash.value()?.openJobs ?? 0 }}</strong><span>Open jobs</span></article>
        <article><strong>{{ dash.value()?.newApplicantsThisWeek ?? 0 }}</strong><span>New this week</span></article>
        <article><strong>{{ dash.value()?.hired ?? 0 }}</strong><span>Hired</span></article>
        <article>
          <strong>{{ billing.value()?.planName ?? 'Free–Growth' }}</strong>
          <span>
            @if (billing.value(); as bill) {
              {{ bill.usage.publishedJobs }}/{{ bill.usage.publishedLimit ?? '∞' }} published
            } @else {
              Plan limits apply when this API has billing
            }
          </span>
        </article>
      </div>
      <div class="chips">
        @for (entry of pipeline(); track entry[0]) {
          <span class="chip">{{ entry[0] }} · {{ entry[1] }}</span>
        }
      </div>
    }
    <h2>Your jobs</h2>
    @if (jobs.isLoading() && !jobs.value()?.length) {
      <hs-skeleton />
    } @else if (!jobs.value()?.length) {
      <hs-empty-state title="No jobs yet" message="Create a company, then post your first role.">
        <a routerLink="/employer/company" class="button">Company settings</a>
      </hs-empty-state>
    } @else {
      <div class="stack">
        @for (job of jobs.value(); track job.id) {
          <article class="card job-row">
            <div class="job-row-main">
              <div class="job-row-title">
                <a [routerLink]="['/jobs', job.slug]"><strong>{{ job.title }}</strong></a>
                <hs-status-badge [status]="job.status" />
                @if (isFeatured(job)) { <span class="chip open">Featured</span> }
              </div>
              <p class="muted">{{ job._count.applications }} applicants</p>
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

  pipeline() {
    return Object.entries(this.dash.value()?.pipeline ?? {});
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
