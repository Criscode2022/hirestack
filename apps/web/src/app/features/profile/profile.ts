import { Component, inject, signal } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import { httpResource } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthStore } from '../../core/auth.store';
import { ToastService } from '../../core/toast.service';
import { FieldError } from '../../shared/ui';

interface Resume {
  id: string;
  fileName: string;
  fileUrl: string;
  isCurrent: boolean;
  createdAt: string;
}

@Component({
  selector: 'hs-profile',
  imports: [FormField, FieldError],
  template: `
    <h1>Profile</h1>
    <form (submit)="save($event)">
      <label>Name <input [formField]="profileForm.name" /></label>
      <hs-field-error [show]="profileForm.name().touched() && profileForm.name().invalid()" [errors]="profileForm.name().errors()" />
      <label>Headline <input [formField]="profileForm.headline" /></label>
      <label>Location <input [formField]="profileForm.location" /></label>
      <label>Bio <textarea rows="4" [formField]="profileForm.bio"></textarea></label>
      <label>Portfolio URL <input [formField]="profileForm.portfolioUrl" /></label>
      <label>Desired min <input type="number" [formField]="profileForm.desiredSalaryMin" /></label>
      <label>Desired max <input type="number" [formField]="profileForm.desiredSalaryMax" /></label>
      <button type="submit">Save profile</button>
    </form>

    <section>
      <h2>Resumes</h2>
      <input type="file" accept="application/pdf" (change)="upload($event)" />
      <ul>
        @for (resume of resumes.value(); track resume.id) {
          <li>{{ resume.fileName }} @if (resume.isCurrent) { · current }</li>
        }
      </ul>
    </section>
  `,
})
export class ProfilePage {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthStore);
  private readonly toast = inject(ToastService);
  readonly resumes = httpResource<Resume[]>(() => `${environment.apiUrl}/me/resumes`);
  readonly model = signal({
    name: this.auth.user()?.name ?? '',
    headline: this.auth.user()?.headline ?? '',
    location: this.auth.user()?.location ?? '',
    bio: this.auth.user()?.bio ?? '',
    portfolioUrl: this.auth.user()?.portfolioUrl ?? '',
    desiredSalaryMin: this.auth.user()?.desiredSalaryMin ?? 0,
    desiredSalaryMax: this.auth.user()?.desiredSalaryMax ?? 0,
  });
  readonly profileForm = form(this.model, (schema) => {
    required(schema.name, { message: 'Name is required' });
  });

  async save(event: Event) {
    event.preventDefault();
    await firstValueFrom(this.http.patch(`${environment.apiUrl}/me`, this.model()));
    this.toast.show('Profile updated', 'success');
  }

  async upload(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const body = new FormData();
    body.append('file', file);
    try {
      const uploaded = await firstValueFrom(
        this.http.post<{ url: string; pathname: string }>(`${environment.apiUrl}/files/resume`, body),
      );
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/me/resumes`, {
          url: uploaded.url,
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        }),
      );
      this.resumes.reload();
      this.toast.show('Resume uploaded', 'success');
    } catch {
      this.toast.show('Upload failed. PDF only, 5MB max, Blob token required.', 'error');
    }
  }
}
