import { Component, inject, signal } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import { httpResource } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
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
  imports: [FormField, FieldError, RouterLink],
  template: `
    <header class="page-head">
      <div>
        <p class="eyebrow">Your desk</p>
        <h1>Profile</h1>
      </div>
      @if (auth.user()?.id) {
        <a class="ghost" [routerLink]="['/people', auth.user()!.id]">View public profile</a>
      }
    </header>
    <form (submit)="save($event)">
      <label>Name <input [formField]="profileForm.name" /></label>
      <hs-field-error [show]="profileForm.name().touched() && profileForm.name().invalid()" [errors]="profileForm.name().errors()" />
      <label>Headline <input [formField]="profileForm.headline" /></label>
      <label>Location <input [formField]="profileForm.location" /></label>
      <label>Bio <textarea rows="4" [formField]="profileForm.bio"></textarea></label>
      <label>Portfolio URL <input [formField]="profileForm.portfolioUrl" /></label>
      <label>Desired min <input type="number" [formField]="profileForm.desiredSalaryMin" /></label>
      <label>Desired max <input type="number" [formField]="profileForm.desiredSalaryMax" /></label>
      <label class="row"><input type="checkbox" [checked]="openToWork()" (change)="openToWork.set($any($event.target).checked)" /> Open to work</label>
      <button type="submit">Save profile</button>
    </form>

    <section>
      <h2>Experience</h2>
      <form (submit)="addExperience($event)">
        <label>Title <input name="title" required /></label>
        <label>Company <input name="companyName" required /></label>
        <label>Start <input type="date" name="startDate" required /></label>
        <button type="submit" class="ghost">Add role</button>
      </form>
      <ul>
        @for (item of experience.value(); track item.id) {
          <li>{{ item.title }} · {{ item.companyName }} <button type="button" class="ghost" (click)="removeExperience(item.id)">Remove</button></li>
        }
      </ul>
    </section>

    <section>
      <h2>Education</h2>
      <form (submit)="addEducation($event)">
        <label>School <input name="school" required /></label>
        <label>Field <input name="field" /></label>
        <button type="submit" class="ghost">Add school</button>
      </form>
      <ul>
        @for (item of education.value(); track item.id) {
          <li>{{ item.school }} · {{ item.field }} <button type="button" class="ghost" (click)="removeEducation(item.id)">Remove</button></li>
        }
      </ul>
    </section>

    <section>
      <h2>Featured work</h2>
      <form (submit)="addProject($event)">
        <label>Title <input name="title" required /></label>
        <label>URL <input name="url" /></label>
        <button type="submit" class="ghost">Add project</button>
      </form>
      <ul>
        @for (item of projects.value(); track item.id) {
          <li>{{ item.title }} <button type="button" class="ghost" (click)="removeProject(item.id)">Remove</button></li>
        }
      </ul>
    </section>

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
  readonly auth = inject(AuthStore);
  private readonly toast = inject(ToastService);
  readonly resumes = httpResource<Resume[]>(() => `${environment.apiUrl}/me/resumes`);
  readonly experience = httpResource<Array<{ id: string; title: string; companyName: string }>>(
    () => `${environment.apiUrl}/me/experience`,
  );
  readonly education = httpResource<Array<{ id: string; school: string; field: string | null }>>(
    () => `${environment.apiUrl}/me/education`,
  );
  readonly projects = httpResource<Array<{ id: string; title: string }>>(
    () => `${environment.apiUrl}/me/projects`,
  );
  readonly openToWork = signal(this.auth.user()?.openToWork ?? false);
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
    await firstValueFrom(
      this.http.patch(`${environment.apiUrl}/me`, { ...this.model(), openToWork: this.openToWork() }),
    );
    this.toast.show('Profile updated', 'success');
  }

  async addExperience(event: Event) {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const data = new FormData(form);
    await firstValueFrom(
      this.http.post(`${environment.apiUrl}/me/experience`, {
        title: String(data.get('title')),
        companyName: String(data.get('companyName')),
        startDate: String(data.get('startDate')),
        isCurrent: true,
      }),
    );
    form.reset();
    this.experience.reload();
  }

  async removeExperience(id: string) {
    await firstValueFrom(this.http.delete(`${environment.apiUrl}/me/experience/${id}`));
    this.experience.reload();
  }

  async addEducation(event: Event) {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const data = new FormData(form);
    await firstValueFrom(
      this.http.post(`${environment.apiUrl}/me/education`, {
        school: String(data.get('school')),
        field: String(data.get('field') || ''),
      }),
    );
    form.reset();
    this.education.reload();
  }

  async removeEducation(id: string) {
    await firstValueFrom(this.http.delete(`${environment.apiUrl}/me/education/${id}`));
    this.education.reload();
  }

  async addProject(event: Event) {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const data = new FormData(form);
    await firstValueFrom(
      this.http.post(`${environment.apiUrl}/me/projects`, {
        title: String(data.get('title')),
        url: String(data.get('url') || ''),
      }),
    );
    form.reset();
    this.projects.reload();
  }

  async removeProject(id: string) {
    await firstValueFrom(this.http.delete(`${environment.apiUrl}/me/projects/${id}`));
    this.projects.reload();
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
