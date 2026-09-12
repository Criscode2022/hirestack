import { Component, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { environment } from '../../../environments/environment';
import { EmptyState, JobCard, PersonCard, Skeleton } from '../../shared/ui';
import { rememberSearch } from '../../shared/recent-search';
import type { SearchBundle } from '@hirestack/shared';

@Component({
  selector: 'hs-search',
  imports: [RouterLink, JobCard, PersonCard, Skeleton, EmptyState],
  template: `
    <header class="page-head">
      <div>
        <p class="eyebrow">Search</p>
        <h1>{{ query().get('q') || 'Everything' }}</h1>
        <p class="lede">Jobs, people, and companies in one look. Press / anytime to search again.</p>
      </div>
    </header>
    @if (!query().get('q')) {
      <hs-empty-state title="Type a word to start" message="Try Angular, Austin, or Northwind." />
    } @else if (bundle.isLoading()) {
      <hs-skeleton />
    } @else if (bundle.error()) {
      <hs-empty-state title="Search is unavailable" message="Could not search right now. Retry in a moment." />
    } @else if (!bundle.value()) {
      <hs-empty-state title="Nothing matched" message="Try a skill, a city, or a company name." />
    } @else {
      @let data = bundle.value()!;
      <section>
        <div class="section-head"><h2>Jobs</h2><a routerLink="/jobs">All jobs</a></div>
        @if (!data.jobs.length) {
          <hs-empty-state title="No jobs for that query" message="Try a skill, a city, or a company name." />
        } @else {
          <div class="grid">
            @for (job of data.jobs; track job.id) { <hs-job-card [job]="job" /> }
          </div>
        }
      </section>
      <section>
        <div class="section-head"><h2>People</h2><a routerLink="/people">Directory</a></div>
        @if (!data.people.length) {
          <hs-empty-state title="No people for that query" message="Names, headlines, and skills all match." />
        } @else {
          <div class="grid">
            @for (person of data.people; track person.id) {
              <hs-person-card [person]="person" />
            }
          </div>
        }
      </section>
      <section>
        <div class="section-head"><h2>Companies</h2><a routerLink="/companies">All companies</a></div>
        @if (!data.companies.length) {
          <hs-empty-state title="No companies for that query" message="Try Northwind, Atlas, or Lumen." />
        } @else {
          <div class="grid">
            @for (firm of data.companies; track firm.id) {
              <article class="person-card">
                <div class="job-card-brand">
                  @if (firm.logoUrl) {
                    <img class="logo-mark" [src]="firm.logoUrl" [alt]="firm.name" width="36" height="36" loading="lazy" decoding="async" />
                  } @else {
                    <span class="logo-mark fallback" aria-hidden="true">{{ firm.name.slice(0, 1) }}</span>
                  }
                  <div>
                    <a [routerLink]="['/companies', firm.slug]"><strong>{{ firm.name }}</strong></a>
                    <p class="muted">{{ firm.industry }} · {{ firm.openJobs }} open jobs</p>
                  </div>
                </div>
              </article>
            }
          </div>
        }
      </section>
    }
  `,
})
export class SearchPage {
  private readonly route = inject(ActivatedRoute);
  private readonly platformId = inject(PLATFORM_ID);
  readonly query = toSignal(this.route.queryParamMap, { requireSync: true });
  readonly bundle = httpResource<SearchBundle>(() => {
    const q = this.query().get('q') ?? '';
    if (isPlatformBrowser(this.platformId) && q) {
      rememberSearch(q);
    }
    return q ? `${environment.apiUrl}/search?q=${encodeURIComponent(q)}` : undefined;
  });
}
