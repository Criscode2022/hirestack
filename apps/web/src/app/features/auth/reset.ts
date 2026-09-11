import { Component, inject, signal } from '@angular/core';
import { FormField, form, minLength, required } from '@angular/forms/signals';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../core/toast.service';
import { AuthPitch, FieldError } from '../../shared/ui';

@Component({
  selector: 'hs-reset',
  imports: [FormField, RouterLink, FieldError, AuthPitch],
  template: `
    <div class="auth-split">
      <hs-auth-pitch />
      <section class="auth-card">
      <p class="eyebrow">Account</p>
      <h1>Choose a new password</h1>
      <form (submit)="submit($event)">
        <label>New password <input type="password" [formField]="resetForm.password" autocomplete="new-password" /></label>
        <hs-field-error [show]="resetForm.password().touched() && resetForm.password().invalid()" [errors]="resetForm.password().errors()" />
        <button type="submit" [disabled]="pending() || !token">Save password</button>
      </form>
      @if (!token) {
        <p class="muted">This page needs a reset token from email.</p>
      }
      <p><a routerLink="/login">Sign in</a></p>
      </section>
    </div>
  `,
})
export class ResetPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';
  readonly pending = signal(false);
  readonly model = signal({ password: '' });
  readonly resetForm = form(this.model, (schema) => {
    required(schema.password, { message: 'Password is required' });
    minLength(schema.password, 8, { message: 'Use at least 8 characters' });
  });

  async submit(event: Event) {
    event.preventDefault();
    if (this.resetForm().invalid() || !this.token) return;
    this.pending.set(true);
    try {
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/auth/reset`, { token: this.token, password: this.model().password }),
      );
      this.toast.show('Password updated. Sign in.', 'success');
      await this.router.navigateByUrl('/login');
    } catch {
      this.toast.show('Reset link is invalid or expired', 'error');
    } finally {
      this.pending.set(false);
    }
  }
}
