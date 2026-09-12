import { Component, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthStore } from '../../core/auth.store';
import { EmptyState, Skeleton } from '../../shared/ui';
import type { CompanyCard } from '@hirestack/shared';

interface FollowedCompany {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  industry: string | null;
}

@Component({
  selector: 'hs-companies',
  imports: [RouterLink, EmptyState, Skeleton],
  template: `
    <header class="page-head">
      <div>
        <p class="eyebrow">Companies</p>
        <h1>Who is hiring</h1>
        <p class="lede">Open roles, team size, and a short story for each hiring desk.</p>
      </div>
    </header>
    @if (auth.isAuthenticated()) {
      <section>
        <header class="section-head">
          <h2>Following</h2>
        </header>
        @if (followed.isLoading()) {
          <hs-skeleton [rows]="[1]" [height]="88" />
        } @else if (followed.error()) {
          <hs-empty-state title="Could not load following" message="Retry in a moment. Companies below still list who is hiring." />
        } @else if (!followed.value()?.length) {
          <hs-empty-state title="Not following anyone yet" message="Open a company page and follow it to keep their roles close." />
        } @else {
          <div class="grid followed-firms">
            @for (firm of followed.value(); track firm.id) {
              <article class="person-card">
                <div class="job-card-brand">
                  @if (firm.logoUrl) {
                    <img class="logo-mark" [src]="firm.logoUrl" [alt]="firm.name" width="36" height="36" loading="lazy" decoding="async" />
                  } @else {
                    <span class="logo-mark fallback" aria-hidden="true">{{ firm.name.slice(0, 1) }}</span>
                  }
                  <div>
                    <p class="eyebrow">{{ firm.industry }}</p>
                    <a [routerLink]="['/companies', firm.slug]"><strong>{{ firm.name }}</strong></a>
                  </div>
                </div>
              </article>
            }
          </div>
        }
      </section>
    }
    @if (firms.isLoading()) {
      <hs-skeleton />
    } @else if (firms.error()) {
      <hs-empty-state title="Could not load companies" message="Please try again in a moment." />
    } @else if (!firms.value()?.length) {
      <hs-empty-state title="No companies listed" message="Hiring teams appear here once they create a company page." />
    } @else {
      <div class="grid">
        @for (firm of firms.value(); track firm.id) {
          <article class="person-card">
            <div class="job-card-brand">
              @if (firm.logoUrl) {
                <img class="logo-mark" [src]="firm.logoUrl" [alt]="firm.name" width="36" height="36" loading="lazy" decoding="async" />
              } @else {
                <span class="logo-mark fallback" aria-hidden="true">{{ firm.name.slice(0, 1) }}</span>
              }
              <div>
                <p class="eyebrow">{{ firm.industry }}</p>
                <a [routerLink]="['/companies', firm.slug]"><strong>{{ firm.name }}</strong></a>
              </div>
            </div>
            <p class="muted">{{ firm.headquarters }} @if (firm.employeeCount) { · {{ firm.employeeCount }} people }</p>
            @if (firm.description) {
              <p>{{ excerpt(firm.description) }}</p>
            }
            <p class="meta">{{ firm.openJobs }} open jobs · {{ firm.followerCount }} followers</p>
          </article>
        }
      </div>
    }
  `,
})
export class CompanyListPage {
  readonly auth = inject(AuthStore);
  readonly firms = httpResource<CompanyCard[]>(() => `${environment.apiUrl}/companies`);
  readonly followed = httpResource<FollowedCompany[]>(() =>
    this.auth.isAuthenticated() ? `${environment.apiUrl}/me/following` : undefined,
  );

  excerpt(text: string) {
    const trimmed = text.trim();
    return trimmed.length > 140 ? `${trimmed.slice(0, 137)}…` : trimmed;
  }
}
