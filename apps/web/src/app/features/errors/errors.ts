import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'hs-not-found',
  imports: [RouterLink],
  template: `
    <section class="auth-card">
      <p class="eyebrow">404</p>
      <h1>That page is not on HireStack</h1>
      <p class="lede">The link may be old, or the role may have been unpublished.</p>
      <div class="cta-row">
        <a routerLink="/jobs" class="button">Browse jobs</a>
        <a routerLink="/" class="ghost">Go home</a>
      </div>
    </section>
  `,
})
export class NotFoundPage {}

@Component({
  selector: 'hs-forbidden',
  imports: [RouterLink],
  template: `
    <section class="auth-card">
      <p class="eyebrow">403</p>
      <h1>This workspace is closed to your role</h1>
      <p class="lede">Sign in with a hiring account for the pipeline, or a candidate account for applications.</p>
      <div class="cta-row">
        <a routerLink="/login" class="button">Sign in</a>
        <a routerLink="/" class="ghost">Go home</a>
      </div>
    </section>
  `,
})
export class ForbiddenPage {}
