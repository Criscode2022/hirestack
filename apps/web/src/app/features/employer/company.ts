import { Component, effect, inject, signal } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import { HttpClient, httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthStore } from '../../core/auth.store';
import { ToastService } from '../../core/toast.service';
import { EmptyState, FieldError, Skeleton } from '../../shared/ui';

interface CompanyDetail {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  description: string | null;
  logoUrl: string | null;
  industry: string | null;
  headquarters: string | null;
  employeeCount: number | null;
  foundedYear: number | null;
}

@Component({
  selector: 'hs-company-settings',
  imports: [FormField, FieldError, RouterLink, Skeleton, EmptyState],
  template: `
    <header class="page-head">
      <div>
        <p class="eyebrow">Hiring</p>
        <h1>Company</h1>
        <p class="lede">This is the page candidates read before they apply.</p>
      </div>
      @if (auth.user()?.company?.slug) {
        <a class="ghost" [routerLink]="['/companies', auth.user()!.company!.slug]">View public page</a>
      }
    </header>
    @if (existing.isLoading()) {
      <hs-skeleton />
    } @else if (existing.error() && auth.user()?.company) {
      <hs-empty-state title="Could not load company" message="Sign in again, then retry." />
    } @else {
      <form class="card" (submit)="save($event)">
        <div class="company-brand">
          @if (logoUrl()) {
            <img class="logo-mark lg" [src]="logoUrl()!" alt="" width="64" height="64" loading="lazy" decoding="async" />
          } @else {
            <span class="logo-mark lg fallback" aria-hidden="true">{{ model().name.slice(0, 1) || 'H' }}</span>
          }
          <label class="file-drop">
            <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" (change)="upload($event)" />
            <strong>{{ uploading() ? 'Uploading…' : 'Upload a logo' }}</strong>
            <span class="muted">PNG, JPEG, WebP, or SVG. 2MB max.</span>
          </label>
        </div>
        <label>Name <input [formField]="companyForm.name" /></label>
        <hs-field-error [show]="companyForm.name().touched() && companyForm.name().invalid()" [errors]="companyForm.name().errors()" />
        <div class="fields-2">
          <label>Website <input [formField]="companyForm.website" placeholder="https://" /></label>
          <label>Industry <input [formField]="companyForm.industry" placeholder="Software" /></label>
        </div>
        <div class="fields-2">
          <label>Headquarters <input [formField]="companyForm.headquarters" placeholder="Austin, TX" /></label>
          <label>Team size <input type="number" [formField]="companyForm.employeeCount" /></label>
        </div>
        <label>Founded <input type="number" [formField]="companyForm.foundedYear" /></label>
        <label>Description <textarea rows="5" [formField]="companyForm.description"></textarea></label>
        <div class="cta-row">
          <button type="submit" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save company' }}</button>
          <a routerLink="/employer/jobs/new" class="ghost">Post a job</a>
        </div>
      </form>
    }
  `,
})
export class CompanySettingsPage {
  private readonly http = inject(HttpClient);
  readonly auth = inject(AuthStore);
  private readonly toast = inject(ToastService);
  readonly saving = signal(false);
  readonly uploading = signal(false);
  readonly logoUrl = signal<string | null>(null);
  readonly model = signal({
    name: this.auth.user()?.company?.name ?? '',
    website: '',
    description: '',
    industry: '',
    headquarters: '',
    employeeCount: 0,
    foundedYear: 0,
  });
  readonly companyForm = form(this.model, (schema) => {
    required(schema.name, { message: 'Company name is required' });
  });
  readonly existing = httpResource<CompanyDetail>(() => {
    const slug = this.auth.user()?.company?.slug;
    return slug ? `${environment.apiUrl}/companies/${slug}` : undefined;
  });

  constructor() {
    effect(() => {
      const data = this.existing.value();
      if (!data) return;
      this.logoUrl.set(data.logoUrl);
      this.model.set({
        name: data.name,
        website: data.website ?? '',
        description: data.description ?? '',
        industry: data.industry ?? '',
        headquarters: data.headquarters ?? '',
        employeeCount: data.employeeCount ?? 0,
        foundedYear: data.foundedYear ?? 0,
      });
    });
  }

  async upload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const body = new FormData();
    body.append('file', file);
    this.uploading.set(true);
    try {
      const uploaded = await firstValueFrom(
        this.http.post<{ url: string }>(`${environment.apiUrl}/files/logo`, body),
      );
      this.logoUrl.set(uploaded.url);
      const existing = this.auth.user()?.company;
      if (existing) {
        await firstValueFrom(
          this.http.patch(`${environment.apiUrl}/companies/${existing.id}`, { logoUrl: uploaded.url }),
        );
        await this.auth.refresh();
        this.toast.show('Logo updated', 'success');
      } else {
        this.toast.show('Logo ready. Save the company to keep it.', 'success');
      }
    } catch {
      const seed = encodeURIComponent(this.model().name.trim() || 'HireStack');
      const url = `https://api.dicebear.com/9.x/initials/svg?seed=${seed}&backgroundColor=0f766e&fontWeight=700`;
      this.logoUrl.set(url);
      const existing = this.auth.user()?.company;
      if (existing) {
        try {
          await firstValueFrom(
            this.http.patch(`${environment.apiUrl}/companies/${existing.id}`, { logoUrl: url }),
          );
          await this.auth.refresh();
        } catch {
          this.toast.show('Could not save the generated mark. Save the company to keep it.', 'error');
          this.uploading.set(false);
          input.value = '';
          return;
        }
      }
      this.toast.show('We generated a logo from the company name.', 'success');
    } finally {
      this.uploading.set(false);
      input.value = '';
    }
  }

  async save(event: Event) {
    event.preventDefault();
    if (this.companyForm().invalid()) return;
    this.saving.set(true);
    try {
      const existing = this.auth.user()?.company;
      const payload = this.payload();
      if (existing) {
        await firstValueFrom(this.http.patch(`${environment.apiUrl}/companies/${existing.id}`, payload));
      } else {
        await firstValueFrom(this.http.post(`${environment.apiUrl}/companies`, payload));
        await this.auth.refresh();
      }
      this.toast.show('Company saved', 'success');
    } catch {
      this.toast.show('Could not save company', 'error');
    } finally {
      this.saving.set(false);
    }
  }

  private payload() {
    const value = this.model();
    const website = value.website.trim();
    return {
      name: value.name.trim(),
      description: value.description.trim() || undefined,
      website: website ? (website.startsWith('http') ? website : `https://${website}`) : undefined,
      industry: value.industry.trim() || undefined,
      headquarters: value.headquarters.trim() || undefined,
      employeeCount: value.employeeCount > 0 ? Number(value.employeeCount) : undefined,
      foundedYear: value.foundedYear > 1800 ? Number(value.foundedYear) : undefined,
      logoUrl: this.logoUrl() || undefined,
    };
  }
}
