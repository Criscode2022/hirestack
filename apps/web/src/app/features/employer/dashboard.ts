import { Component } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { EmptyState, Skeleton, StatusBadge } from '../../shared/ui';

interface EmployerJob {
  id: string;
  slug: string;
  title: string;
  status: string;
  _count: { applications: number };
}

interface Dashboard {
  openJobs: number;
  newApplicantsThisWeek: number;
  pipeline: Record<string, number>;
}

@Component({
  selector: 'hs-employer-dashboard',
  imports: [RouterLink, Skeleton, EmptyState, StatusBadge],
  template: `
    <header class="page-head">
      <h1>Employer dashboard</h1>
      <a routerLink="/employer/jobs/new" class="button">Post a job</a>
    </header>
    @if (dash.isLoading()) {
      <hs-skeleton />
    } @else {
      <div class="stats">
        <article><strong>{{ dash.value()?.openJobs ?? 0 }}</strong><span>Open jobs</span></article>
        <article><strong>{{ dash.value()?.newApplicantsThisWeek ?? 0 }}</strong><span>New applicants this week</span></article>
      </div>
      <div class="chips">
        @for (entry of pipeline(); track entry[0]) {
          <span class="chip">{{ entry[0] }} · {{ entry[1] }}</span>
        }
      </div>
    }
    <h2>Your jobs</h2>
    @if (jobs.isLoading()) {
      <hs-skeleton />
    } @else if (!jobs.value()?.length) {
      <hs-empty-state title="No jobs yet" message="Create a company, then post your first role." />
    } @else {
      <div class="stack">
        @for (job of jobs.value(); track job.id) {
          <article class="card row">
            <div>
              <strong>{{ job.title }}</strong>
              <hs-status-badge [status]="job.status" />
              <p>{{ job._count.applications }} applicants</p>
            </div>
            <a [routerLink]="['/employer/jobs', job.id, 'inbox']">Inbox</a>
            <a [routerLink]="['/employer/jobs', job.id, 'edit']">Edit</a>
          </article>
        }
      </div>
    }
  `,
})
export class EmployerDashboardPage {
  readonly dash = httpResource<Dashboard>(() => `${environment.apiUrl}/me/employer-dashboard`);
  readonly jobs = httpResource<EmployerJob[]>(() => `${environment.apiUrl}/me/jobs`);

  pipeline() {
    return Object.entries(this.dash.value()?.pipeline ?? {});
  }
}
