import { Component, inject, signal } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthStore } from '../../core/auth.store';
import { ToastService } from '../../core/toast.service';
import { FieldError } from '../../shared/ui';

@Component({
  selector: 'hs-company-settings',
  imports: [FormField, FieldError],
  template: `
    <h1>Company</h1>
    <form (submit)="save($event)">
      <label>Name <input [formField]="companyForm.name" /></label>
      <hs-field-error [show]="companyForm.name().touched() && companyForm.name().invalid()" [errors]="companyForm.name().errors()" />
      <label>Website <input [formField]="companyForm.website" /></label>
      <label>Description <textarea rows="5" [formField]="companyForm.description"></textarea></label>
      <button type="submit">Save company</button>
    </form>
  `,
})
export class CompanySettingsPage {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthStore);
  private readonly toast = inject(ToastService);
  readonly model = signal({
    name: this.auth.user()?.company?.name ?? '',
    website: '',
    description: '',
  });
  readonly companyForm = form(this.model, (schema) => {
    required(schema.name, { message: 'Company name is required' });
  });

  async save(event: Event) {
    event.preventDefault();
    try {
      const existing = this.auth.user()?.company;
      if (existing) {
        await firstValueFrom(this.http.patch(`${environment.apiUrl}/companies/${existing.id}`, this.model()));
      } else {
        await firstValueFrom(this.http.post(`${environment.apiUrl}/companies`, this.model()));
        await this.auth.refresh();
      }
      this.toast.show('Company saved', 'success');
    } catch {
      this.toast.show('Could not save company', 'error');
    }
  }
}
