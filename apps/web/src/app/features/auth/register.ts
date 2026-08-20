import { Component, inject, signal } from '@angular/core';
import { FormField, email, form, minLength, required } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../core/auth.store';
import { FieldError } from '../../shared/ui';

@Component({
  selector: 'hs-register',
  imports: [FormField, RouterLink, FieldError],
  template: `
    <section class="auth-card">
      <p class="eyebrow">Join HireStack</p>
      <h1>Create a profile</h1>
      <p class="lede">Free for candidates and hiring teams. No resume marketplace.</p>
      <form (submit)="submit($event)">
        <label>Name <input [formField]="registerForm.name" autocomplete="name" /></label>
        <hs-field-error [show]="registerForm.name().touched() && registerForm.name().invalid()" [errors]="registerForm.name().errors()" />
        <label>Email <input type="email" [formField]="registerForm.email" autocomplete="email" /></label>
        <hs-field-error [show]="registerForm.email().touched() && registerForm.email().invalid()" [errors]="registerForm.email().errors()" />
        <label>Password <input type="password" [formField]="registerForm.password" autocomplete="new-password" /></label>
        <hs-field-error [show]="registerForm.password().touched() && registerForm.password().invalid()" [errors]="registerForm.password().errors()" />
        <fieldset>
          <legend>I am here to</legend>
          <div class="role-pick">
            <label>
              <input type="radio" value="CANDIDATE" [formField]="registerForm.role" />
              <strong>Find work</strong>
              <span class="muted">Save jobs and apply</span>
            </label>
            <label>
              <input type="radio" value="EMPLOYER" [formField]="registerForm.role" />
              <strong>Hire people</strong>
              <span class="muted">Post roles and review</span>
            </label>
          </div>
        </fieldset>
        <button type="submit" [disabled]="pending()">Create account</button>
      </form>
      <p>Already registered? <a routerLink="/login">Sign in</a></p>
    </section>
  `,
})
export class RegisterPage {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  readonly pending = signal(false);
  readonly model = signal({ name: '', email: '', password: '', role: 'CANDIDATE' as 'CANDIDATE' | 'EMPLOYER' });
  readonly registerForm = form(this.model, (schema) => {
    required(schema.name, { message: 'Name is required' });
    required(schema.email, { message: 'Email is required' });
    email(schema.email, { message: 'Enter a valid email' });
    required(schema.password, { message: 'Password is required' });
    minLength(schema.password, 8, { message: 'Use at least 8 characters' });
  });

  async submit(event: Event) {
    event.preventDefault();
    if (this.registerForm().invalid()) return;
    this.pending.set(true);
    try {
      const user = await this.auth.register(this.model());
      await this.router.navigateByUrl(user.role === 'EMPLOYER' ? '/employer/company' : '/profile');
    } finally {
      this.pending.set(false);
    }
  }
}
