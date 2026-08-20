import { Component, PLATFORM_ID, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormField, form } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { httpResource } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthStore } from '../../core/auth.store';
import { EmptyState, JobCard, Skeleton } from '../../shared/ui';
import { readRecentSearches, rememberSearch } from '../../shared/recent-search';
import type { MarketTapeItem, PublicJobCard } from '@hirestack/shared';

@Component({
  selector: 'hs-landing',
  imports: [FormField, RouterLink, JobCard, Skeleton, EmptyState],
  template: `
    @if (tape.value()?.length) {
      <div class="tape" aria-label="Latest activity">
        <div class="tape-track">
          @for (item of looped(); track $index) {
            <a [routerLink]="item.href">{{ item.label }}</a>
          }
        </div>
      </div>
    }

    <section class="hero">
      <p class="eyebrow">A quieter hiring network</p>
      <h1>Find the role. Meet the person.</h1>
      <p class="lede">
        Search open jobs, read a real profile, and message before you apply. Soft on the eyes, fast in the hands.
      </p>
      <form class="search" (submit)="go($event)">
        <label>
          What are you looking for?
          <input type="search" placeholder="Try Angular, remote, or Northwind" [formField]="searchForm.q" />
        </label>
        <button type="submit">Search</button>
      </form>
      <div class="chips">
        <button type="button" class="chip quick" (click)="quick('Angular')">Angular</button>
        <button type="button" class="chip quick" (click)="quick('Remote')">Remote</button>
        <button type="button" class="chip quick" (click)="quick('Staff')">Staff</button>
        <button type="button" class="chip quick" (click)="quick('Design')">Design</button>
      </div>
      @if (recent().length) {
        <p class="muted">Recent: 
          @for (item of recent(); track item) {
            <button type="button" class="chip quick" (click)="quick(item)">{{ item }}</button>
          }
        </p>
      }
    </section>

    <section>
      <div class="section-head">
        <h2>Open this week</h2>
        <a routerLink="/jobs">See all jobs</a>
      </div>
      @if (featured.isLoading()) {
        <hs-skeleton />
      } @else if (featured.error()) {
        <hs-empty-state title="Could not load jobs" message="Please try again in a moment." />
      } @else {
        <div class="grid">
          @for (job of featured.value(); track job.id) {
            <hs-job-card [job]="job" />
          }
        </div>
      }
    </section>

    <section class="how">
      <h2>Simple from both sides</h2>
      <ol>
        <li>Search jobs, people, and companies in one place.</li>
        <li>Show experience, projects, and a current resume.</li>
        <li>Save a search, save a role, and track applications without mystery status jumps.</li>
      </ol>
      <div class="cta-row">
        <a routerLink="/register" class="button">Create a free profile</a>
        <a routerLink="/register" class="ghost">I want to hire</a>
      </div>
    </section>
  `,
})
export class LandingPage {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthStore);
  private readonly platformId = inject(PLATFORM_ID);
  readonly model = signal({ q: '' });
  readonly searchForm = form(this.model);
  readonly recent = signal<string[]>([]);
  readonly featured = httpResource<PublicJobCard[]>(() => `${environment.apiUrl}/jobs/featured`);
  readonly tape = httpResource<MarketTapeItem[]>(() => `${environment.apiUrl}/market/tape`);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.recent.set(readRecentSearches());
    }
    effect(() => {
      if (this.auth.ready() && this.auth.isAuthenticated()) {
        void this.router.navigateByUrl('/feed');
      }
    });
  }

  looped() {
    const rows = this.tape.value() ?? [];
    return rows.length ? [...rows, ...rows] : [];
  }

  go(event: Event) {
    event.preventDefault();
    this.quick(this.model().q);
  }

  quick(q: string) {
    if (isPlatformBrowser(this.platformId) && q.trim()) {
      this.recent.set(rememberSearch(q));
    }
    void this.router.navigate(['/search'], { queryParams: q.trim() ? { q } : {} });
  }
}
