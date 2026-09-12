import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BILLING_PLAN_CATALOG } from '@hirestack/shared';
import { AuthStore } from '../../core/auth.store';

@Component({
  selector: 'hs-pricing',
  imports: [RouterLink],
  template: `
    <header class="page-head">
      <div>
        <p class="eyebrow">Pricing</p>
        <h1>Plans a hiring desk can buy.</h1>
        <p class="lede">Start free. Upgrade when you need more published roles and featured placement. Inventory limits are enforced when you publish.</p>
      </div>
    </header>
    <div class="pricing-grid">
      @for (plan of plans; track plan.id) {
        <article class="price-card" [class.popular]="plan.popular">
          @if (plan.popular) { <span class="chip open">Most teams</span> }
          <h2>{{ plan.name }}</h2>
          <p class="muted">{{ plan.tagline }}</p>
          <p class="amount">{{ plan.monthlyUsd ? '$' + plan.monthlyUsd : '$0' }}<span>/mo</span></p>
          <ul>
            @for (item of plan.highlights; track item) {
              <li>{{ item }}</li>
            }
          </ul>
          <a [routerLink]="ctaLink(plan.id)" class="button">{{ plan.cta }}</a>
        </article>
      }
    </div>
    <section class="faq-grid">
      <article>
        <h3>What do featured slots do?</h3>
        <p class="muted">Featured roles sort first on Open jobs and the home page. Growth includes five slots. Free cannot feature.</p>
      </article>
      <article>
        <h3>What happens on downgrade?</h3>
        <p class="muted">Published jobs stay live. Extra featured slots are cleared. New publishes are blocked until you upgrade again.</p>
      </article>
      <article>
        <h3>Is Stripe required?</h3>
        <p class="muted">No. Without Stripe the workspace upgrades immediately so you can sell the workflow. Add a Stripe secret when you want live cards and receipts.</p>
      </article>
      <article>
        <h3>Who accepts an offer?</h3>
        <p class="muted">Hiring teams can mark hired. Candidates can also accept or decline from Applications. Either desk can close the loop.</p>
      </article>
      <article>
        <h3>Do you sell candidate lists?</h3>
        <p class="muted">Never. Resumes stay private. We do not sell candidate lists or contact data.</p>
      </article>
    </section>
  `,
})
export class PricingPage {
  private readonly auth = inject(AuthStore);
  readonly plans = BILLING_PLAN_CATALOG;

  ctaLink(plan: string) {
    if (this.auth.hasRole('EMPLOYER')) {
      return '/employer/billing';
    }
    return '/register';
  }
}
