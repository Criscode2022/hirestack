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
      <h1>Create your account</h1>
      <form (submit)="submit($event)">
        <label>Name <input [formField]="registerForm.name" /></label>
        <hs-field-error [show]="registerForm.name().touched() && registerForm.name().invalid()" [errors]="registerForm.name().errors()" />
        <label>Email <input type="email" [formField]="registerForm.email" /></label>
        <hs-field-error [show]="registerForm.email().touched() && registerForm.email().invalid()" [errors]="registerForm.email().errors()" />
        <label>Password <input type="password" [formField]="registerForm.password" /></label>
        <hs-field-error [show]="registerForm.password().touched() && registerForm.password().invalid()" [errors]="registerForm.password().errors()" />
        <fieldset>
          <legend>I am a</legend>
          <label><input type="radio" value="CANDIDATE" [formField]="registerForm.role" /> Candidate</label>
          <label><input type="radio" value="EMPLOYER" [formField]="registerForm.role" /> Employer</label>
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
