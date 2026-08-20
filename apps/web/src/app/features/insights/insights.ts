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
    </header>
    @if (salaries.isLoading()) {
      <hs-skeleton />
    } @else if (!salaries.value()?.length) {
      <hs-empty-state title="No priced jobs yet" />
    } @else {
      <div class="stack">
        @for (row of salaries.value(); track row.skill) {
          <article class="person-row list-row">
            <div>
              <strong>{{ row.skill }}</strong>
              <p class="muted">{{ row.roleCount }} priced jobs</p>
            </div>
            <p class="salary">{{ row.currency }} {{ row.salaryMin?.toLocaleString() }}–{{ row.salaryMax?.toLocaleString() }}</p>
          </article>
        }
      </div>
    }
    <section>
      <h2>Latest activity</h2>
      @for (item of tape.value(); track item.id) {
        <p><a [routerLink]="item.href">{{ item.label }}</a></p>
      }
    </section>
  `,
})
export class InsightsPage {
  readonly salaries = httpResource<SalaryInsight[]>(() => `${environment.apiUrl}/insights/salaries`);
  readonly tape = httpResource<MarketTapeItem[]>(() => `${environment.apiUrl}/market/tape`);
}
