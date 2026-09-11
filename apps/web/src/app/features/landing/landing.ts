import { Component, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormField, form } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { httpResource } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthStore } from '../../core/auth.store';
import { EmptyState, JobCard, Skeleton } from '../../shared/ui';
import { readRecentSearches, rememberSearch } from '../../shared/recent-search';
import { BILLING_PLAN_CATALOG, type Paginated, type PublicJobCard } from '@hirestack/shared';

@Component({
  selector: 'hs-landing',
  imports: [FormField, RouterLink, JobCard, Skeleton, EmptyState],
  template: `
    <section class="hero hero-saas">
      <div class="hero-grid">
        <div>
          <p class="eyebrow">Two-sided hiring marketplace</p>
          <h1>The hiring OS that replaces the spreadsheet.</h1>
          <p class="lede">
            Candidates search live jobs and apply with a current resume. Hiring teams publish, feature,
            and move people through a pipeline that will not skip a stage. Plans gate inventory in the product.
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
          <div class="cta-row hero-cta">
            <a routerLink="/register" class="button">Start free</a>
            <a routerLink="/login" class="ghost">See a live hiring desk</a>
            <a routerLink="/pricing" class="ghost">See pricing</a>
          </div>
          <ul class="trust-pills">
            <li>Guarded pipeline</li>
            <li>Resumes never on disk</li>
            <li>Plans gate inventory</li>
          </ul>
        </div>
        <div class="product-frame hero-preview" aria-hidden="true">
          <header>
            <span class="window-dots"><i></i><i></i><i></i></span>
            <span>Hiring desk</span>
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

    <div class="stats landing-stats">
      <article>
        <strong>{{ census.value()?.meta.total ?? (census.isLoading() ? '…' : '—') }}</strong>
        <span>Live roles</span>
      </article>
      <article>
        <strong>3</strong>
        <span>Workspace plans</span>
      </article>
      <article>
        <strong>Guarded</strong>
        <span>Pipeline stages</span>
      </article>
      <article>
        <strong>Private</strong>
        <span>Resumes stay private</span>
      </article>
    </div>

    <section class="plan-strip" aria-label="Workspace plans">
      @for (plan of plans; track plan.id) {
        <article [class.popular]="plan.popular">
          @if (plan.popular) { <span class="chip open">Most teams</span> }
          <p class="plan-name">{{ plan.name }}</p>
          <p class="amount">{{ plan.monthlyUsd ? '$' + plan.monthlyUsd : '$0' }}<span>/mo</span></p>
          <p class="muted">{{ plan.tagline }}</p>
          <a routerLink="/pricing">{{ plan.cta }}</a>
        </article>
      }
    </section>

    <div class="logo-row" aria-label="Companies already on the marketplace">
      @if (brands().length) {
        @for (firm of brands(); track firm.slug) {
          <a class="logo-pill" [routerLink]="['/companies', firm.slug]">
            <img class="logo-mark" [src]="firm.logoUrl" [alt]="firm.name" width="28" height="28" />
            {{ firm.name }}
          </a>
        }
      } @else {
        <span>Northwind Labs</span>
        <span>Atlas Freight</span>
        <span>Lumen Studio</span>
      }
      <span>Candidates</span>
      <span>Hiring desks</span>
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
      } @else if (!featured.value()?.length) {
        <hs-empty-state title="No featured roles yet" message="Open jobs still lists every published role.">
          <a routerLink="/jobs" class="button">Browse jobs</a>
        </hs-empty-state>
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
        <h2>Built for both sides of the market</h2>
      </div>
      <div class="persona-grid">
        <article>
          <p class="eyebrow">Candidates</p>
          <h3>Apply once. Watch every stage.</h3>
          <p class="muted">Search open roles, save a shortlist, apply with a current PDF, and watch every status change.</p>
          <a routerLink="/register" class="ghost">Create a candidate profile</a>
        </article>
        <article>
          <p class="eyebrow">Hiring teams</p>
          <h3>Publish, feature, and move people</h3>
          <p class="muted">Post a role, feature it if the plan allows, and move people through a pipeline that will not skip a stage.</p>
          <a routerLink="/pricing" class="ghost">See employer plans</a>
        </article>
      </div>
    </section>

    <section>
      <div class="section-head">
        <h2>Three desks. One marketplace.</h2>
      </div>
      <div class="desk-tour">
        <article class="product-frame">
          <header>
            <span>Candidate desk</span>
            <span class="chip open">Apply</span>
          </header>
          <p class="muted">Save a role, send a current resume, and watch every legal status change.</p>
          <div class="mini-kanban">
            <article>
              <strong>Submitted</strong>
              <p>Staff Angular · Northwind</p>
            </article>
            <article>
              <strong>Interview</strong>
              <p>Platform · Atlas</p>
            </article>
            <article>
              <strong>Offer</strong>
              <p>Design lead · Lumen</p>
            </article>
          </div>
        </article>
        <article class="product-frame">
          <header>
            <span>Hiring desk</span>
            <span class="chip open">Growth</span>
          </header>
          <p class="muted">Publish, feature, and move people. The pipeline will not skip a stage.</p>
          <div class="mini-kanban">
            <article>
              <strong>Review</strong>
              <p>Alex Rivera</p>
            </article>
            <article>
              <strong>Interview</strong>
              <p>Jamie Ortiz</p>
            </article>
            <article>
              <strong>Hired</strong>
              <p>Riley Cho</p>
            </article>
          </div>
        </article>
        <article class="product-frame">
          <header>
            <span>Admin desk</span>
            <span class="chip">Moderation</span>
          </header>
          <p class="muted">Staff first. Automation signups stay off the default user list.</p>
          <div class="mini-kanban">
            <article>
              <strong>Users</strong>
              <p>Avery Admin</p>
            </article>
            <article>
              <strong>Jobs</strong>
              <p>Published · Draft</p>
            </article>
            <article>
              <strong>Plans</strong>
              <p>Free · Starter · Growth</p>
            </article>
          </div>
        </article>
      </div>
    </section>

    <section>
      <div class="feature-grid">
        <article>
          <p class="eyebrow">Marketplace</p>
          <h3>Two-sided by default</h3>
          <p class="muted">Candidates, hiring teams, and admins share one product. A role cannot invent a status the desk does not understand.</p>
        </article>
        <article>
          <p class="eyebrow">Pipeline</p>
          <h3>Stages you cannot skip</h3>
          <p class="muted">Submitted cannot jump to hired. Teams review, interview, then offer. Candidates withdraw only while it is still early.</p>
        </article>
        <article>
          <p class="eyebrow">Revenue</p>
          <h3>Plans that sell themselves</h3>
          <p class="muted">Free, Starter, and Growth cap published jobs and featured slots in the API, not in a screenshot.</p>
        </article>
      </div>
    </section>

    <section>
      <div class="section-head">
        <h2>Why teams buy this over a board</h2>
      </div>
      <div class="compare">
        <div>
          <h3>Job board template</h3>
          <ul>
            <li>Status is a free-text dropdown</li>
            <li>Resumes sit on the app server</li>
            <li>Pricing is a screenshot</li>
          </ul>
        </div>
        <div>
          <h3>HireStack</h3>
          <ul>
            <li>Pipeline stages with guardrails</li>
            <li>Resumes in object storage, never on disk</li>
            <li>Publish and featured slots enforced</li>
          </ul>
        </div>
      </div>
    </section>

    <div class="logo-row" aria-label="Product guarantees">
      <span>Role-based access</span>
      <span>We never sell resumes</span>
      <span>Plans enforced on publish</span>
      <span>Checkout when you are ready</span>
    </div>

    <section class="quote">
      <p class="eyebrow">From a hiring lead</p>
      <p>“We opened a role, featured it on Growth, and moved Alex from submitted to interview without anyone inventing a status. That is the product we wanted to buy.”</p>
    </section>

    <section class="how">
      <div class="section-head">
        <h2>Simple from both sides</h2>
      </div>
      <div class="how-grid">
        <article>
          <p class="eyebrow">01</p>
          <h3>Create a free profile</h3>
          <p class="muted">Candidate or hiring team. We never sell resumes.</p>
        </article>
        <article>
          <p class="eyebrow">02</p>
          <h3>Publish and feature</h3>
          <p class="muted">Post a role, feature it on a paid plan, and move people on a kanban.</p>
        </article>
        <article>
          <p class="eyebrow">03</p>
          <h3>Message and hire</h3>
          <p class="muted">Keep resumes in object storage. The pipeline will not skip a stage.</p>
        </article>
      </div>
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
  readonly plans = BILLING_PLAN_CATALOG;
  readonly model = signal({ q: '' });
  readonly searchForm = form(this.model);
  readonly recent = signal<string[]>([]);
  readonly featured = httpResource<PublicJobCard[]>(() =>
    isPlatformBrowser(this.platformId) ? `${environment.apiUrl}/jobs/featured` : undefined,
  );
  readonly census = httpResource<Paginated<PublicJobCard>>(() =>
    isPlatformBrowser(this.platformId) ? `${environment.apiUrl}/jobs?pageSize=1` : undefined,
  );
  readonly brands = computed(() => {
    const seen = new Set<string>();
    const firms: Array<{ slug: string; name: string; logoUrl: string }> = [];
    for (const job of this.featured.value() ?? []) {
      const logo = job.company.logoUrl;
      if (!logo || seen.has(job.company.slug)) {
        continue;
      }
      seen.add(job.company.slug);
      firms.push({ slug: job.company.slug, name: job.company.name, logoUrl: logo });
    }
    return firms;
  });

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
