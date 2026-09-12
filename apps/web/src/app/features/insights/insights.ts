import { Component } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { EmptyState, Skeleton } from '../../shared/ui';
import { formatCompensation, payBandPercent, type MarketTapeItem, type SalaryInsight } from '@hirestack/shared';

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
      <hs-empty-state title="Could not load salaries" message="Could not load salary ranges. Retry in a moment." />
    } @else if (!salaries.value()?.length) {
      <hs-empty-state title="No priced jobs yet" message="Published roles with a salary range appear here.">
        <a routerLink="/jobs" class="ghost">Open jobs</a>
      </hs-empty-state>
    } @else {
      <div class="salary-grid">
        @for (row of salaries.value()!; track row.skill) {
          <article class="salary-card">
            <p class="eyebrow">{{ row.skill }}</p>
            <p class="salary">{{ formatPay(row) }}</p>
            <div class="pay-bar" aria-hidden="true"><i [style.width.%]="band(row)"></i></div>
            <p class="muted">{{ row.roleCount }} priced {{ row.roleCount === 1 ? 'job' : 'jobs' }}</p>
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
      } @else if (tape.error()) {
        <hs-empty-state title="Could not load activity" message="Salary insights stay up. Activity returns when the API is reachable." />
      } @else if (!tape.value()?.length) {
        <hs-empty-state title="No recent activity" message="New jobs, hires, and posts show up here as hiring desks move." />
      } @else {
        <ul class="activity-list">
          @for (item of tape.value()!; track item.id) {
            <li><a [routerLink]="item.href">{{ item.label }}</a></li>
          }
        </ul>
      }
    </section>
  `,
})
export class InsightsPage {
  readonly salaries = httpResource<SalaryInsight[]>(() => `${environment.apiUrl}/insights/salaries`);
  readonly tape = httpResource<MarketTapeItem[]>(() => `${environment.apiUrl}/market/tape`);

  formatPay(row: SalaryInsight) {
    return formatCompensation(row.salaryMin, row.salaryMax, row.currency);
  }

  band(row: SalaryInsight) {
    const ceiling = Math.max(...(this.salaries.value() ?? []).map((item) => item.salaryMax ?? 0), 1);
    return payBandPercent(row.salaryMax, ceiling);
  }
}
