import { Component, inject } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { httpResource } from '@angular/common/http';
import { signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { EmptyState, JobCard, Skeleton } from '../../shared/ui';
import type { PublicJobCard } from '@hirestack/shared';

@Component({
  selector: 'hs-landing',
  imports: [FormField, RouterLink, JobCard, Skeleton, EmptyState],
  template: `
    <section class="hero">
      <p class="eyebrow">Two-sided hiring, built for 2026</p>
      <h1>Find the role. Hire the person. Skip the noise.</h1>
      <p class="lede">
        HireStack is a job and freelance marketplace with real RBAC, a legal application pipeline,
        and search that stays in Postgres.
      </p>
      <form class="search" (submit)="go($event)">
        <label>
          Search jobs
          <input type="search" placeholder="Angular, remote, staff…" [formField]="searchForm.q" />
        </label>
        <button type="submit">Search roles</button>
      </form>
    </section>

    <section>
      <div class="section-head">
        <h2>Featured roles</h2>
        <a routerLink="/jobs">View all</a>
      </div>
      @if (featured.isLoading()) {
        <hs-skeleton />
      } @else if (featured.error()) {
        <hs-empty-state title="Could not load jobs" message="The API is unavailable right now." />
      } @else if (!featured.value()?.length) {
        <hs-empty-state title="No featured jobs" message="Publish a role to see it here." />
      } @else {
        <div class="grid">
          @for (job of featured.value(); track job.id) {
            <hs-job-card [job]="job" />
          }
        </div>
      }
    </section>

    <section class="how">
      <h2>How it works</h2>
      <div class="grid three">
        <article><h3>1. Search</h3><p>Filter by workplace, seniority, salary, and skills. Listings are SSR so they stay crawlable.</p></article>
        <article><h3>2. Apply</h3><p>Upload one current PDF resume, pick it at apply time, and track every status change.</p></article>
        <article><h3>3. Hire</h3><p>Employers move candidates through a real state machine. Illegal transitions return 409.</p></article>
      </div>
      <div class="cta-row">
        <a routerLink="/register" class="button">Create a candidate account</a>
        <a routerLink="/register" class="ghost">Hire on HireStack</a>
      </div>
    </section>
  `,
})
export class LandingPage {
  private readonly router = inject(Router);
  readonly model = signal({ q: '' });
  readonly searchForm = form(this.model, (schema) => {
    required(schema.q, { message: 'Enter a keyword or try Angular' });
  });
  readonly featured = httpResource<PublicJobCard[]>(() => `${environment.apiUrl}/jobs/featured`);

  go(event: Event) {
    event.preventDefault();
    void this.router.navigate(['/jobs'], { queryParams: { q: this.model().q || undefined } });
  }
}
