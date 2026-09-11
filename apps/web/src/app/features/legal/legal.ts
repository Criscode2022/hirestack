import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'hs-privacy',
  imports: [RouterLink],
  template: `
    <article class="legal">
      <p class="eyebrow">Legal</p>
      <h1>Privacy</h1>
      <p>HireStack stores account data, job applications, and messages to operate the marketplace. Resumes and logos are uploaded to object storage, not the API filesystem.</p>
      <p>We do not sell candidate lists. Access JWTs stay in memory. Refresh cookies are httpOnly and scoped to authentication routes.</p>
      <p>You can request deletion of a profile through an administrator. Seed accounts exist only for product demos.</p>
      <a routerLink="/" class="ghost">Back home</a>
    </article>
  `,
})
export class PrivacyPage {}

@Component({
  selector: 'hs-terms',
  imports: [RouterLink],
  template: `
    <article class="legal">
      <p class="eyebrow">Legal</p>
      <h1>Terms</h1>
      <p>HireStack is a two-sided hiring product. Employers may post roles they are authorized to fill. Candidates must submit accurate profiles.</p>
      <p>Application status changes follow a published state machine. Illegal transitions are rejected. Featured listings are a paid inventory slot, not an endorsement.</p>
      <p>Demo billing upgrades the workspace plan immediately when Stripe is not configured. Production payments require a Stripe secret on the API.</p>
      <a routerLink="/pricing" class="ghost">View pricing</a>
    </article>
  `,
})
export class TermsPage {}
