import { Component, inject, signal } from '@angular/core';
import { FormField, email, form, required } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../core/auth.store';
import { safeInternalPath } from '../../core/guards';
import { ToastService } from '../../core/toast.service';
import { AuthPitch, FieldError } from '../../shared/ui';

@Component({
  selector: 'hs-login',
  imports: [FormField, RouterLink, FieldError, AuthPitch],
  template: `
    <div class="auth-split">
      <hs-auth-pitch />
      <section class="auth-card">
        <p class="eyebrow">Welcome back</p>
        <h1>Sign in</h1>
        <p class="lede">Pick up saved jobs, messages, and your application list.</p>
        <form (submit)="submit($event)">
          <label>Email <input type="email" [formField]="loginForm.email" autocomplete="username" /></label>
          <hs-field-error [show]="loginForm.email().touched() && loginForm.email().invalid()" [errors]="loginForm.email().errors()" />
          <label>Password <input type="password" [formField]="loginForm.password" autocomplete="current-password" /></label>
          <hs-field-error [show]="loginForm.password().touched() && loginForm.password().invalid()" [errors]="loginForm.password().errors()" />
          @if (error()) {
            <p class="form-alert">{{ error() }}</p>
          }
          <button type="submit" [disabled]="pending()">{{ pending() ? 'Signing in…' : 'Sign in' }}</button>
        </form>
        <p class="muted">Try a seeded desk</p>
        <div class="demo-desks">
          <button type="button" class="ghost demo-desk" [disabled]="pending()" (click)="demo('candidate')">
            <strong>Demo candidate</strong>
            <span>Alex Rivera · apply and track</span>
          </button>
          <button type="button" class="ghost demo-desk" [disabled]="pending()" (click)="demo('employer')">
            <strong>Demo employer</strong>
            <span>Nora Chen · hiring desk</span>
          </button>
          <button type="button" class="ghost demo-desk" [disabled]="pending()" (click)="demo('admin')">
            <strong>Demo admin</strong>
            <span>Avery Admin · moderation</span>
          </button>
        </div>
        <p>Need an account? <a routerLink="/register" [queryParams]="nextParams()">Join free</a></p>
        <p><a routerLink="/forgot">Forgot password</a></p>
      </section>
    </div>
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  readonly pending = signal(false);
  readonly error = signal('');
  readonly model = signal({ email: '', password: '' });

  protected nextParams(): Record<string, string> {
    const next = safeInternalPath(this.route.snapshot.queryParamMap.get('next'));
    return next ? { next } : {};
  }
  readonly loginForm = form(this.model, (schema) => {
    required(schema.email, { message: 'Email is required' });
    email(schema.email, { message: 'Enter a valid email' });
    required(schema.password, { message: 'Password is required' });
  });

  demo(kind: 'candidate' | 'employer' | 'admin') {
    const email =
      kind === 'employer'
        ? 'employer.northwind@hirestack.dev'
        : kind === 'admin'
          ? 'admin@hirestack.dev'
          : 'candidate.alex@hirestack.dev';
    void this.enter({
      email,
      password: 'HireStack!2026',
    });
  }

  async submit(event: Event) {
    event.preventDefault();
    if (this.loginForm().invalid()) return;
    await this.enter(this.model());
  }

  private async enter(creds: { email: string; password: string }) {
    this.model.set(creds);
    this.error.set('');
    this.pending.set(true);
    try {
      const user = await this.auth.login(creds.email, creds.password);
      const dest = user.role === 'ADMIN' ? '/admin' : user.role === 'EMPLOYER' ? '/employer' : '/feed';
      const next = safeInternalPath(this.route.snapshot.queryParamMap.get('next'));
      await this.router.navigateByUrl(next ?? dest);
    } catch {
      this.error.set('Email or password is wrong. Try a demo account if you are exploring.');
      this.toast.show('Could not sign in', 'error');
    } finally {
      this.pending.set(false);
    }
  }
}
