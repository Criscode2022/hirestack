import { Component, PLATFORM_ID, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormField, form } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { httpResource } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthStore } from '../../core/auth.store';
import { EmptyState, JobCard, Skeleton } from '../../shared/ui';
import { readRecentSearches, rememberSearch } from '../../shared/recent-search';
import type { PublicJobCard } from '@hirestack/shared';

@Component({
  selector: 'hs-landing',
  imports: [FormField, RouterLink, JobCard, Skeleton, EmptyState],
  template: `
    <section class="hero hero-saas">
      <div class="hero-grid">
        <div>
          <p class="eyebrow">Hiring software, not a job board clone</p>
          <h1>The hiring OS you can sell on day one.</h1>
          <p class="lede">
            Candidates search crawlable roles. Employers run a legal pipeline. Admins keep the marketplace clean.
            HireStack looks like a product a recruiter would pay for.
          </p>
          <form class="search" (submit)="go($event)">
            <label>
              What role are you filling or finding?
              <input type="search" placeholder="Try Angular, remote, or Northwind" [formField]="searchForm.q" />
            </label>
            <button type="submit">Search jobs</button>
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
          <div class="cta-row" style="margin-top:1rem">
            <a routerLink="/register" class="button">Start free</a>
            <a routerLink="/pricing" class="ghost">See pricing</a>
          </div>
        </div>
        <div class="product-frame" aria-hidden="true">
          <header>
            <span>Employer pipeline</span>
            <span class="chip open">Growth plan</span>
          </header>
          <div class="mini-kanban">
            <article>
              <strong>Submitted</strong>
              <p>Alex Rivera · Angular</p>
              <p>Jamie Ortiz · NestJS</p>
            </article>
            <article>
              <strong>Interview</strong>
              <p>Riley Cho · Staff FE</p>
            </article>
            <article>
              <strong>Offer</strong>
              <p>Sam Okonkwo · Full-stack</p>
            </article>
          </div>
        </div>
      </div>
    </section>

    <div class="logo-row" aria-label="Seed companies on the marketplace">
      <span>Northwind Labs</span>
      <span>Atlas Freight</span>
      <span>Lumen Studio</span>
      <span>Legal transitions</span>
      <span>Neon + Vercel</span>
    </div>

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

    <section>
      <div class="section-head">
        <h2>Built to sell, not demo</h2>
      </div>
      <div class="feature-grid">
        <article>
          <p class="eyebrow">Marketplace</p>
          <h3>Two-sided by default</h3>
          <p class="muted">Candidates, employers, and admins share one schema. Roles cannot invent a status the API does not understand.</p>
        </article>
        <article>
          <p class="eyebrow">Pipeline</p>
          <h3>Illegal moves return 409</h3>
          <p class="muted">SUBMITTED to HIRED is blocked. Employers review, interview, offer. Candidates withdraw only while it is still early.</p>
        </article>
        <article>
          <p class="eyebrow">Revenue</p>
          <h3>Plans that gate inventory</h3>
          <p class="muted">Free, Starter, and Growth cap published and featured jobs so billing is a product, not a slide.</p>
        </article>
      </div>
    </section>

    <section class="how">
      <h2>Simple from both sides</h2>
      <ol>
        <li>Create a free profile as a candidate or a hiring team.</li>
        <li>Publish a role, feature it on a paid plan, and move applicants on a kanban.</li>
        <li>Message, notify, and keep resumes on object storage — never on the Nest disk.</li>
      </ol>
      <div class="cta-row">
        <a routerLink="/register" class="button">Create a free profile</a>
        <a routerLink="/live" class="ghost">See live announcements</a>
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
  readonly featured = httpResource<PublicJobCard[]>(() =>
    isPlatformBrowser(this.platformId) ? `${environment.apiUrl}/jobs/featured` : undefined,
  );

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
