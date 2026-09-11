import { Component } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { EmptyState, Skeleton } from '../../shared/ui';
import type { MarketTapeItem, SalaryInsight } from '@hirestack/shared';

@Component({
  selector: 'hs-insights',
  imports: [RouterLink, EmptyState, Skeleton],
  template: `
    <header class="page-head">
      <div>
        <p class="eyebrow">Pay</p>
        <h1>Salary ranges</h1>
        <p class="lede">Taken from published full-time and part-time jobs. Honest ranges, not a survey.</p>
      </div>
      <a routerLink="/jobs" class="ghost">Browse jobs</a>
    </header>
    @if (salaries.isLoading()) {
      <hs-skeleton />
    } @else if (salaries.error()) {
      <hs-empty-state title="Could not load salaries" message="The insights API may still be starting." />
    } @else if (!salaries.value()?.length) {
      <hs-empty-state title="No priced jobs yet" message="Published roles with a salary range appear here.">
        <a routerLink="/jobs" class="ghost">Open jobs</a>
      </hs-empty-state>
    } @else {
      <div class="stack">
        @for (row of salaries.value()!; track row.skill) {
          <article class="person-row list-row">
            <div>
              <strong>{{ row.skill }}</strong>
              <p class="muted">{{ row.roleCount }} priced {{ row.roleCount === 1 ? 'job' : 'jobs' }}</p>
            </div>
            <p class="salary">{{ row.currency }} {{ row.salaryMin?.toLocaleString() }}–{{ row.salaryMax?.toLocaleString() }}</p>
          </article>
        }
      </div>
    }
    <section>
      <div class="section-head">
        <h2>Latest activity</h2>
      </div>
      @if (tape.isLoading()) {
        <hs-skeleton [rows]="[1, 2]" [height]="48" />
      } @else if (!tape.value()?.length) {
        <hs-empty-state title="Quiet tape" message="New jobs, hires, and posts show up here as the market moves." />
      } @else {
        @for (item of tape.value()!; track item.id) {
          <p class="list-row"><a [routerLink]="item.href">{{ item.label }}</a></p>
        }
      }
    </section>
  `,
})
export class InsightsPage {
  readonly salaries = httpResource<SalaryInsight[]>(() => `${environment.apiUrl}/insights/salaries`);
  readonly tape = httpResource<MarketTapeItem[]>(() => `${environment.apiUrl}/market/tape`);
}
