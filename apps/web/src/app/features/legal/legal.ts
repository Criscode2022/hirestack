import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'hs-privacy',
  imports: [RouterLink],
  template: `
    <article class="legal">
      <p class="eyebrow">Legal</p>
      <h1>Privacy</h1>
      <p>HireStack is a two-sided hiring marketplace. We store the account, company, job, application, and message data needed to run that marketplace. Resumes and logos are uploaded to object storage, not the API filesystem.</p>
      <h2>What we collect</h2>
      <p>Account name, email, role, and profile fields you enter. Job listings, applications, pipeline events, and messages between people who already share a thread. Billing plan, usage meters, and invoices for hiring workspaces.</p>
      <h2>What we do not do</h2>
      <p>We do not sell candidate lists. We do not sell resumes. Access JWTs stay in memory. Refresh cookies are httpOnly and scoped to authentication routes.</p>
      <h2>How long we keep it</h2>
      <p>Profile and application records stay until you or an administrator delete them. Demo seed accounts exist only so buyers can try the product. Password reset links expire in one hour.</p>
      <h2>Requests</h2>
      <p>You can request deletion of a profile through an administrator. Hiring teams can close roles. Candidates can withdraw while the application is still early in the pipeline.</p>
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
      <p>HireStack is hiring software. Employers may post roles they are authorized to fill. Candidates must submit accurate profiles and current resumes.</p>
      <h2>The marketplace</h2>
      <p>Candidates search live jobs, save a shortlist, and apply. Hiring teams publish, feature, and move people. Administrators moderate accounts and listings.</p>
      <h2>The pipeline</h2>
      <p>Application status changes follow a published state machine. Illegal transitions are rejected with a conflict. Featured listings are a paid inventory slot, not an endorsement of the employer or the candidate.</p>
      <h2>Plans and billing</h2>
      <p>Free, Starter, and Growth cap published jobs and featured slots in the API. Demo billing upgrades the workspace immediately when Stripe is not configured. Production card charges require a Stripe secret on the API. Downgrades keep published jobs live and clear extra featured slots.</p>
      <h2>Acceptable use</h2>
      <p>Do not scrape candidate lists, post roles you cannot fill, or use the product to store files on our application servers. Object storage is the only supported upload path.</p>
      <a routerLink="/pricing" class="ghost">View pricing</a>
    </article>
  `,
})
export class TermsPage {}
