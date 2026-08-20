import { Component } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { EmptyState, Skeleton } from '../../shared/ui';
import type { CompanyCard } from '@hirestack/shared';

@Component({
  selector: 'hs-companies',
  imports: [RouterLink, EmptyState, Skeleton],
  template: `
    <header class="page-head">
      <div>
        <p class="eyebrow">Companies</p>
        <h1>Who is hiring</h1>
        <p class="lede">Open roles, team size, and a short story — not a logo wall.</p>
      </div>
    </header>
    @if (firms.isLoading()) {
      <hs-skeleton />
    } @else if (!firms.value()?.length) {
      <hs-empty-state title="No companies listed" />
    } @else {
      <div class="grid">
        @for (firm of firms.value(); track firm.id) {
          <article class="card">
            <div class="cover"></div>
            <p class="eyebrow">{{ firm.industry }}</p>
            <a [routerLink]="['/companies', firm.slug]"><strong>{{ firm.name }}</strong></a>
            <p class="muted">{{ firm.headquarters }} @if (firm.employeeCount) { · {{ firm.employeeCount }} people }</p>
            <p class="meta">{{ firm.openJobs }} open jobs · {{ firm.followerCount }} following</p>
          </article>
        }
      </div>
    }
  `,
})
export class CompanyListPage {
  readonly firms = httpResource<CompanyCard[]>(() => `${environment.apiUrl}/companies`);
}
