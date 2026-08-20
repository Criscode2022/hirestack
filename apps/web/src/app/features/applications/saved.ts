import { Component } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { EmptyState, JobCard, Skeleton } from '../../shared/ui';
import type { PublicJobCard } from '@hirestack/shared';

@Component({
  selector: 'hs-saved',
  imports: [JobCard, Skeleton, EmptyState, RouterLink],
  template: `
    <header class="page-head">
      <div>
        <p class="eyebrow">Later</p>
        <h1>Saved jobs</h1>
        <p class="lede">Roles you want to keep nearby. Unsave from any card.</p>
      </div>
      <a class="ghost" routerLink="/jobs">Find more</a>
    </header>
    @if (jobs.isLoading()) { <hs-skeleton /> }
    @else if (!jobs.value()?.length) {
      <hs-empty-state title="Nothing saved yet" message="Tap Save on a job card when something feels right.">
        <a class="button" routerLink="/jobs">Browse jobs</a>
      </hs-empty-state>
    }
    @else {
      <div class="grid">
        @for (job of jobs.value(); track job.id) {
          <hs-job-card [job]="job" />
        }
      </div>
    }
  `,
})
export class SavedJobsPage {
  readonly jobs = httpResource<PublicJobCard[]>(() => `${environment.apiUrl}/me/saved-jobs`);
}
