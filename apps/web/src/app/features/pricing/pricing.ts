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
        <p class="lede">Start free. Upgrade when you need more published roles and featured placement. Stripe-ready checkout ships with the API.</p>
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
        <h3>Can I sell this as-is?</h3>
        <p class="muted">Yes. Plans gate inventory, the pipeline is a state machine, and files go to Vercel Blob. Connect Stripe when you want live cards.</p>
      </article>
      <article>
        <h3>What happens on downgrade?</h3>
        <p class="muted">Published jobs stay live. New publishes and extra featured slots are blocked until you upgrade again.</p>
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
    return plan === 'FREE' ? '/register' : '/register';
  }
}
