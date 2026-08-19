import { Component, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../../environments/environment';
import { EmptyState, JobCard, Skeleton } from '../../shared/ui';
import type { PublicJobCard } from '@hirestack/shared';

interface CompanyDetail {
  name: string;
  slug: string;
  website: string | null;
  description: string | null;
  logoUrl: string | null;
  jobs: PublicJobCard[];
}

@Component({
  selector: 'hs-company-public',
  imports: [JobCard, Skeleton, EmptyState],
  template: `
    @if (company.isLoading()) {
      <hs-skeleton />
    } @else if (!company.value()) {
      <hs-empty-state title="Company not found" message="The profile may have been removed." />
    } @else {
      @let data = company.value()!;
      <header class="page-head">
        <h1>{{ data.name }}</h1>
        @if (data.website) { <a [href]="data.website" rel="noreferrer" target="_blank">Website</a> }
      </header>
      <p>{{ data.description }}</p>
      <h2>Open roles</h2>
      <div class="grid">
        @for (job of data.jobs; track job.id) {
          <hs-job-card [job]="job" />
        }
      </div>
    }
  `,
})
export class CompanyPublicPage {
  private readonly route = inject(ActivatedRoute);
  readonly company = httpResource<CompanyDetail>(() => {
    const slug = this.route.snapshot.paramMap.get('slug');
    return slug ? `${environment.apiUrl}/companies/${slug}` : undefined;
  });
}
