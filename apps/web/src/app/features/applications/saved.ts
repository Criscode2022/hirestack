import { Component } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { EmptyState, JobCard, Skeleton } from '../../shared/ui';
import type { PublicJobCard } from '@hirestack/shared';

@Component({
  selector: 'hs-saved',
  imports: [JobCard, Skeleton, EmptyState],
  template: `
    <h1>Saved jobs</h1>
    @if (jobs.isLoading()) { <hs-skeleton /> }
    @else if (!jobs.value()?.length) { <hs-empty-state title="No saved jobs" message="Save a role from the job page." /> }
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
