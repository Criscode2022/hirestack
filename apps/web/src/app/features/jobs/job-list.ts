import { Component, computed, effect, inject, signal } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { FormField, form } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import {
  EMPLOYMENT_TYPES,
  SENIORITIES,
  WORKPLACES,
  type Paginated,
  type PublicJobCard,
  type SavedSearch,
} from '@hirestack/shared';
import { environment } from '../../../environments/environment';
import { AuthStore } from '../../core/auth.store';
import { ToastService } from '../../core/toast.service';
import { EmptyState, JobCard, Skeleton } from '../../shared/ui';

@Component({
  selector: 'hs-job-list',
  imports: [FormField, JobCard, Skeleton, EmptyState],
  template: `
    <header class="page-head">
      <div>
        <p class="eyebrow">Find work</p>
        <h1>Open jobs</h1>
        <p class="lede">{{ result.isLoading() && !result.value() ? 'Loading roles…' : (result.value()?.meta.total ?? 0) + ' roles you can read in a minute.' }}</p>
      </div>
    </header>

    <div class="chips">
      <button type="button" class="chip quick" [class.active]="chipOn('workplace', 'REMOTE')" (click)="quick('workplace', 'REMOTE')">Remote</button>
      <button type="button" class="chip quick" [class.active]="chipOn('workplace', 'HYBRID')" (click)="quick('workplace', 'HYBRID')">Hybrid</button>
      <button type="button" class="chip quick" [class.active]="chipOn('seniority', 'SENIOR')" (click)="quick('seniority', 'SENIOR')">Senior</button>
      <button type="button" class="chip quick" [class.active]="chipOn('seniority', 'STAFF')" (click)="quick('seniority', 'STAFF')">Staff</button>
      <button type="button" class="chip quick" [class.active]="chipOn('type', 'CONTRACT')" (click)="quick('type', 'CONTRACT')">Contract</button>
      <button type="button" class="chip quick" [class.active]="chipOn('type', 'FREELANCE')" (click)="quick('type', 'FREELANCE')">Freelance</button>
      <button type="button" class="chip quick" [class.active]="chipOn('postedWithinDays', '7')" (click)="quick('postedWithinDays', '7')">This week</button>
    </div>

    <form class="filters" (submit)="apply($event)">
      <label>Keyword <input [formField]="filters.q" placeholder="Angular, design, Austin" /></label>
      <label>Location <input [formField]="filters.location" placeholder="City or remote" /></label>
      <label>Workplace
        <select [formField]="filters.workplace">
          <option value="">Any</option>
          @for (item of workplaces; track item) { <option [value]="item">{{ label(item) }}</option> }
        </select>
      </label>
      <label>Type
        <select [formField]="filters.type">
          <option value="">Any</option>
          @for (item of types; track item) { <option [value]="item">{{ label(item) }}</option> }
        </select>
      </label>
      <label>Seniority
        <select [formField]="filters.seniority">
          <option value="">Any</option>
          @for (item of seniorities; track item) { <option [value]="item">{{ label(item) }}</option> }
        </select>
      </label>
      <label>Sort
        <select [formField]="filters.sort">
          <option value="newest">Newest</option>
          <option value="salary">Pay</option>
          <option value="relevance">Relevance</option>
        </select>
      </label>
      <div class="cta-row">
        <button type="submit">Show jobs</button>
        @if (auth.hasRole('CANDIDATE')) {
          <button type="button" class="ghost" (click)="saveSearch()">Save this search</button>
        }
      </div>
    </form>

    @if (auth.hasRole('CANDIDATE') && searches().length) {
      <div class="saved-row">
        <span class="muted">Saved searches</span>
        @for (row of searches(); track row.id) {
          <button type="button" class="chip quick" (click)="useSearch(row)">{{ row.name }}</button>
          <button type="button" class="ghost" (click)="removeSearch(row.id)">Remove</button>
        }
      </div>
    }

    @if (result.isLoading() && !result.value()?.data.length) {
      <hs-skeleton [rows]="[1,2,3,4]" />
    } @else if (result.error()) {
      <hs-empty-state title="Search failed" message="Check the API and try again." />
    } @else if (!result.value()?.data.length) {
      <hs-empty-state title="No matching jobs" message="Clear a filter or try a broader keyword.">
        <button type="button" class="ghost" (click)="clearFilters()">Show all jobs</button>
      </hs-empty-state>
    } @else {
      <div class="grid">
        @for (job of result.value()!.data; track job.id) {
          <hs-job-card [job]="job" />
        }
      </div>
      <nav class="pager" aria-label="Pagination">
        <button type="button" class="ghost" [disabled]="page() <= 1" (click)="setPage(page() - 1)">Previous</button>
        <span>Page {{ page() }} of {{ result.value()?.meta.totalPages }}</span>
        <button type="button" class="ghost" [disabled]="page() >= (result.value()?.meta.totalPages ?? 1)" (click)="setPage(page() + 1)">Next</button>
      </nav>
    }
  `,
})
export class JobListPage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthStore);
  readonly query = toSignal(this.route.queryParamMap, { requireSync: true });
  readonly workplaces = WORKPLACES;
  readonly types = EMPLOYMENT_TYPES;
  readonly seniorities = SENIORITIES;
  readonly searches = signal<SavedSearch[]>([]);

  readonly model = signal({
    q: this.route.snapshot.queryParamMap.get('q') ?? '',
    location: this.route.snapshot.queryParamMap.get('location') ?? '',
    workplace: this.route.snapshot.queryParamMap.get('workplace') ?? '',
    type: this.route.snapshot.queryParamMap.get('type') ?? '',
    seniority: this.route.snapshot.queryParamMap.get('seniority') ?? '',
    postedWithinDays: this.route.snapshot.queryParamMap.get('postedWithinDays') ?? '',
    sort: this.route.snapshot.queryParamMap.get('sort') ?? 'newest',
  });
  readonly filters = form(this.model);
  readonly page = computed(() => Number(this.query().get('page') ?? 1));

  readonly result = httpResource<Paginated<PublicJobCard>>(() => {
    const params = new URLSearchParams();
    const map = this.query();
    for (const key of ['q', 'location', 'workplace', 'type', 'seniority', 'sort', 'page', 'postedWithinDays']) {
      const value = map.get(key);
      if (value) params.set(key, value);
    }
    return `${environment.apiUrl}/jobs?${params.toString()}`;
  });

  constructor() {
    effect(() => {
      if (this.auth.ready() && this.auth.hasRole('CANDIDATE')) {
        void this.loadSearches();
      }
    });
  }

  label(value: string) {
    return value.toLowerCase().replaceAll('_', ' ');
  }

  chipOn(key: 'workplace' | 'seniority' | 'postedWithinDays' | 'type', value: string) {
    return this.query().get(key) === value;
  }

  apply(event: Event) {
    event.preventDefault();
    void this.router.navigate([], { queryParams: { ...this.clean(this.model()), page: 1 } });
  }

  quick(key: 'workplace' | 'seniority' | 'postedWithinDays' | 'type', value: string) {
    const current = this.query().get(key) === value ? '' : value;
    this.model.update((model) => ({ ...model, [key]: current }));
    void this.router.navigate([], { queryParams: { ...this.clean({ ...this.model(), [key]: current }), page: 1 } });
  }

  setPage(page: number) {
    void this.router.navigate([], {
      queryParams: { ...Object.fromEntries(this.query().keys.map((k) => [k, this.query().get(k)])), page },
    });
  }

  clearFilters() {
    this.model.set({
      q: '',
      location: '',
      workplace: '',
      type: '',
      seniority: '',
      postedWithinDays: '',
      sort: 'newest',
    });
    void this.router.navigate(['/jobs']);
  }

  async saveSearch() {
    const queryJson = this.clean(this.model());
    const name =
      [queryJson['q'], queryJson['location'], queryJson['workplace'], queryJson['seniority']]
        .filter(Boolean)
        .join(' · ') || 'Saved search';
    await firstValueFrom(
      this.http.post(`${environment.apiUrl}/me/saved-searches`, { name, queryJson }),
    );
    this.toast.show('Search saved', 'success');
    await this.loadSearches();
  }

  useSearch(row: SavedSearch) {
    const next = { ...this.model(), ...row.queryJson };
    this.model.set({
      q: String(next.q ?? ''),
      location: String(next.location ?? ''),
      workplace: String(next.workplace ?? ''),
      type: String(next.type ?? ''),
      seniority: String(next.seniority ?? ''),
      postedWithinDays: String(next.postedWithinDays ?? ''),
      sort: String(next.sort ?? 'newest'),
    });
    void this.router.navigate([], { queryParams: { ...this.clean(this.model()), page: 1 } });
  }

  async removeSearch(id: string) {
    await firstValueFrom(this.http.delete(`${environment.apiUrl}/me/saved-searches/${id}`));
    this.searches.update((rows) => rows.filter((row) => row.id !== id));
  }

  private async loadSearches() {
    this.searches.set(await firstValueFrom(this.http.get<SavedSearch[]>(`${environment.apiUrl}/me/saved-searches`)));
  }

  private clean(model: Record<string, string>) {
    return Object.fromEntries(Object.entries(model).filter(([, value]) => value));
  }
}
