import { Component, inject, signal } from '@angular/core';
import { FormField, form, minLength, required } from '@angular/forms/signals';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthStore } from '../../core/auth.store';
import { ToastService } from '../../core/toast.service';
import { FieldError } from '../../shared/ui';

@Component({
  selector: 'hs-settings',
  imports: [FormField, FieldError, RouterLink],
  template: `
    <header class="page-head">
      <div>
        <p class="eyebrow">Account</p>
        <h1>Settings</h1>
        <p class="lede">Change your password. Theme lives in the header so it follows you across the product.</p>
      </div>
    </header>
    <section class="card">
      <p class="eyebrow">Signed in</p>
      <h2>{{ auth.user()?.name }}</h2>
      <p class="muted">{{ auth.user()?.email }} · {{ roleLabel() }}</p>
    </section>
    <section class="card">
      <p class="eyebrow">Security</p>
      <h2>How sessions work</h2>
      <p class="muted">You stay signed in on this device. Resumes are never stored on the app server.</p>
    </section>
    @if (auth.hasRole('EMPLOYER')) {
      <section class="card">
        <p class="eyebrow">Workspace</p>
        <h2>Billing</h2>
        <p class="muted">Published jobs and featured slots are capped on your plan.</p>
        <a routerLink="/employer/billing" class="ghost">Workspace plan</a>
      </section>
    }
    <form class="card" (submit)="submit($event)">
      <p class="eyebrow">Password</p>
      <h2>Update password</h2>
      <p class="muted">Use at least 8 characters. Changing it does not sign you out.</p>
      <label>Current password
        <span class="password-field">
          <input [type]="showCurrent() ? 'text' : 'password'" [formField]="pwForm.currentPassword" autocomplete="current-password" />
          <button type="button" class="quiet" (click)="showCurrent.set(!showCurrent())">
            {{ showCurrent() ? 'Hide' : 'Show' }}
          </button>
        </span>
      </label>
      <hs-field-error [show]="pwForm.currentPassword().touched() && pwForm.currentPassword().invalid()" [errors]="pwForm.currentPassword().errors()" />
      <label>New password
        <span class="password-field">
          <input [type]="showNext() ? 'text' : 'password'" [formField]="pwForm.nextPassword" autocomplete="new-password" />
          <button type="button" class="quiet" (click)="showNext.set(!showNext())">
            {{ showNext() ? 'Hide' : 'Show' }}
          </button>
        </span>
      </label>
      <hs-field-error [show]="pwForm.nextPassword().touched() && pwForm.nextPassword().invalid()" [errors]="pwForm.nextPassword().errors()" />
      <button type="submit" [disabled]="pending()">{{ pending() ? 'Updating…' : 'Update password' }}</button>
    </form>
  `,
})
export class SettingsPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthStore);
  readonly pending = signal(false);
  readonly showCurrent = signal(false);
  readonly showNext = signal(false);
  readonly model = signal({ currentPassword: '', nextPassword: '' });
  readonly pwForm = form(this.model, (schema) => {
    required(schema.currentPassword, { message: 'Current password is required' });
    required(schema.nextPassword, { message: 'New password is required' });
    minLength(schema.nextPassword, 8, { message: 'Use at least 8 characters' });
  });

  roleLabel() {
    const role = this.auth.user()?.role;
    if (role === 'EMPLOYER') return 'Hiring team';
    if (role === 'ADMIN') return 'Admin';
    return 'Candidate';
  }

  async submit(event: Event) {
    event.preventDefault();
    if (this.pwForm().invalid()) return;
    this.pending.set(true);
    try {
      await firstValueFrom(this.http.post(`${environment.apiUrl}/auth/change-password`, this.model()));
      this.toast.show('Password updated', 'success');
      this.model.set({ currentPassword: '', nextPassword: '' });
    } catch {
      this.toast.show('Could not update password', 'error');
    } finally {
      this.pending.set(false);
    }
  }
}
