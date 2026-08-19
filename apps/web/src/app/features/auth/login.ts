import { Component, inject, signal } from '@angular/core';
import { FormField, email, form, required } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../core/auth.store';
import { FieldError } from '../../shared/ui';

@Component({
  selector: 'hs-login',
  imports: [FormField, RouterLink, FieldError],
  template: `
    <section class="auth-card">
      <h1>Sign in</h1>
      <form (submit)="submit($event)">
        <label>Email <input type="email" [formField]="loginForm.email" /></label>
        <hs-field-error [show]="loginForm.email().touched() && loginForm.email().invalid()" [errors]="loginForm.email().errors()" />
        <label>Password <input type="password" [formField]="loginForm.password" /></label>
        <hs-field-error [show]="loginForm.password().touched() && loginForm.password().invalid()" [errors]="loginForm.password().errors()" />
        <button type="submit" [disabled]="pending()">Sign in</button>
      </form>
      <p>Need an account? <a routerLink="/register">Register</a></p>
    </section>
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  readonly pending = signal(false);
  readonly model = signal({ email: '', password: '' });
  readonly loginForm = form(this.model, (schema) => {
    required(schema.email, { message: 'Email is required' });
    email(schema.email, { message: 'Enter a valid email' });
    required(schema.password, { message: 'Password is required' });
  });

  async submit(event: Event) {
    event.preventDefault();
    if (this.loginForm().invalid()) return;
    this.pending.set(true);
    try {
      const user = await this.auth.login(this.model().email, this.model().password);
      const dest = user.role === 'EMPLOYER' ? '/employer' : user.role === 'ADMIN' ? '/admin' : '/jobs';
      await this.router.navigateByUrl(dest);
    } catch {
      this.pending.set(false);
    } finally {
      this.pending.set(false);
    }
  }
}
