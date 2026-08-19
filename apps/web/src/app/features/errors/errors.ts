import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'hs-not-found',
  imports: [RouterLink],
  template: `
    <section class="auth-card">
      <h1>404</h1>
      <p>That page is not on HireStack.</p>
      <a routerLink="/jobs" class="button">Browse jobs</a>
    </section>
  `,
})
export class NotFoundPage {}

@Component({
  selector: 'hs-forbidden',
  imports: [RouterLink],
  template: `
    <section class="auth-card">
      <h1>403</h1>
      <p>Your role cannot open this workspace.</p>
      <a routerLink="/" class="button">Go home</a>
    </section>
  `,
})
export class ForbiddenPage {}
