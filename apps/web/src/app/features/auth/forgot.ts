import { Component, inject, signal } from '@angular/core';
import { FormField, email, form, required } from '@angular/forms/signals';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../core/toast.service';
import { AuthPitch, FieldError } from '../../shared/ui';

@Component({
  selector: 'hs-forgot',
  imports: [FormField, RouterLink, FieldError, AuthPitch],
  template: `
    <div class="auth-split">
      <hs-auth-pitch />
      <section class="auth-card">
      <p class="eyebrow">Account</p>
      <h1>Reset password</h1>
      <p class="lede">We will email a one-hour link if the address is on HireStack.</p>
      <form (submit)="submit($event)">
        <label>Email <input type="email" [formField]="forgotForm.email" autocomplete="email" /></label>
        <hs-field-error [show]="forgotForm.email().touched() && forgotForm.email().invalid()" [errors]="forgotForm.email().errors()" />
        <button type="submit" [disabled]="pending()">{{ pending() ? 'Sending…' : 'Send reset link' }}</button>
      </form>
      @if (sent()) {
        <p class="muted">If that email exists, a reset link is on the way. Check spam if it is not in the inbox in a few minutes.</p>
      }
      <p><a routerLink="/login">Back to sign in</a></p>
      </section>
    </div>
  `,
})
export class ForgotPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  readonly pending = signal(false);
  readonly sent = signal(false);
  readonly model = signal({ email: '' });
  readonly forgotForm = form(this.model, (schema) => {
    required(schema.email, { message: 'Email is required' });
    email(schema.email, { message: 'Enter a valid email' });
  });

  async submit(event: Event) {
    event.preventDefault();
    if (this.forgotForm().invalid()) return;
    this.pending.set(true);
    this.sent.set(false);
    try {
      await firstValueFrom(this.http.post(`${environment.apiUrl}/auth/forgot`, this.model()));
      this.sent.set(true);
      this.toast.show('If that email exists, a reset link is on the way', 'success');
    } finally {
      this.pending.set(false);
    }
  }
}
