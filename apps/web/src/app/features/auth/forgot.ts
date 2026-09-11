import { Component, inject, signal } from '@angular/core';
import { FormField, email, form, required } from '@angular/forms/signals';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../core/toast.service';
import { FieldError } from '../../shared/ui';

@Component({
  selector: 'hs-forgot',
  imports: [FormField, RouterLink, FieldError],
  template: `
    <section class="auth-card">
      <p class="eyebrow">Account</p>
      <h1>Reset password</h1>
      <p class="lede">We will email a one-hour link if the address is on HireStack.</p>
      <form (submit)="submit($event)">
        <label>Email <input type="email" [formField]="forgotForm.email" autocomplete="email" /></label>
        <hs-field-error [show]="forgotForm.email().touched() && forgotForm.email().invalid()" [errors]="forgotForm.email().errors()" />
        <button type="submit" [disabled]="pending()">Send reset link</button>
      </form>
      <p><a routerLink="/login">Back to sign in</a></p>
    </section>
  `,
})
export class ForgotPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  readonly pending = signal(false);
  readonly model = signal({ email: '' });
  readonly forgotForm = form(this.model, (schema) => {
    required(schema.email, { message: 'Email is required' });
    email(schema.email, { message: 'Enter a valid email' });
  });

  async submit(event: Event) {
    event.preventDefault();
    if (this.forgotForm().invalid()) return;
    this.pending.set(true);
    try {
      await firstValueFrom(this.http.post(`${environment.apiUrl}/auth/forgot`, this.model()));
      this.toast.show('If that email exists, a reset link is on the way', 'success');
    } finally {
      this.pending.set(false);
    }
  }
}
