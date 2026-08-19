import { Component, computed, inject, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { httpResource } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  EMPLOYMENT_TYPES,
  SENIORITIES,
  WORKPLACES,
  type Paginated,
  type PublicJobCard,
} from '@hirestack/shared';
import { environment } from '../../../environments/environment';
import { EmptyState, JobCard, Skeleton } from '../../shared/ui';

@Component({
  selector: 'hs-job-list',
  imports: [FormField, JobCard, Skeleton, EmptyState],
  template: `
    <header class="page-head">
      <h1>Job search</h1>
      <p>{{ result.value()?.meta.total ?? 0 }} open roles</p>
    </header>
    <form class="filters" (submit)="apply($event)">
      <label>Keyword <input [formField]="filters.q" /></label>
      <label>Location <input [formField]="filters.location" /></label>
      <label>Workplace
        <select [formField]="filters.workplace">
          <option value="">Any</option>
          @for (item of workplaces; track item) { <option [value]="item">{{ item }}</option> }
        </select>
      </label>
      <label>Type
        <select [formField]="filters.type">
          <option value="">Any</option>
          @for (item of types; track item) { <option [value]="item">{{ item }}</option> }
        </select>
      </label>
      <label>Seniority
        <select [formField]="filters.seniority">
          <option value="">Any</option>
          @for (item of seniorities; track item) { <option [value]="item">{{ item }}</option> }
        </select>
      </label>
      <label>Sort
        <select [formField]="filters.sort">
          <option value="newest">Newest</option>
          <option value="salary">Salary</option>
          <option value="relevance">Relevance</option>
        </select>
      </label>
      <button type="submit">Apply filters</button>
    </form>

    @if (result.isLoading()) {
      <hs-skeleton [rows]="[1,2,3,4]" />
    } @else if (result.error()) {
      <hs-empty-state title="Search failed" message="Check the API and try again." />
    } @else if (!result.value()?.data.length) {
      <hs-empty-state title="No matching jobs" message="Broaden filters or clear the keyword." />
    } @else {
      <div class="grid">
        @for (job of result.value()!.data; track job.id) {
          <hs-job-card [job]="job" />
        }
      </div>
      <nav class="pager" aria-label="Pagination">
        <button type="button" [disabled]="page() <= 1" (click)="setPage(page() - 1)">Previous</button>
        <span>Page {{ page() }} of {{ result.value()?.meta.totalPages }}</span>
        <button type="button" [disabled]="page() >= (result.value()?.meta.totalPages ?? 1)" (click)="setPage(page() + 1)">Next</button>
      </nav>
    }
  `,
})
export class JobListPage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly query = toSignal(this.route.queryParamMap, { requireSync: true });
  readonly workplaces = WORKPLACES;
  readonly types = EMPLOYMENT_TYPES;
  readonly seniorities = SENIORITIES;

  readonly model = signal({
    q: '',
    location: '',
    workplace: '',
    type: '',
    seniority: '',
    sort: 'newest',
  });
  readonly filters = form(this.model);
  readonly page = computed(() => Number(this.query().get('page') ?? 1));

  readonly result = httpResource<Paginated<PublicJobCard>>(() => {
    const params = new URLSearchParams();
    const map = this.query();
    for (const key of ['q', 'location', 'workplace', 'type', 'seniority', 'sort', 'page']) {
      const value = map.get(key);
      if (value) params.set(key, value);
    }
    return `${environment.apiUrl}/jobs?${params.toString()}`;
  });

  apply(event: Event) {
    event.preventDefault();
    void this.router.navigate([], { queryParams: { ...this.model(), page: 1 } });
  }

  setPage(page: number) {
    void this.router.navigate([], { queryParams: { ...Object.fromEntries(this.query().keys.map((k) => [k, this.query().get(k)])), page } });
  }
}
