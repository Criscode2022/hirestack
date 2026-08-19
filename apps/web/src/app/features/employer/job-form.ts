import { Component, inject, signal } from '@angular/core';
import { FormField, form, required, validate } from '@angular/forms/signals';
import { httpResource } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { EMPLOYMENT_TYPES, SENIORITIES, WORKPLACES } from '@hirestack/shared';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../core/toast.service';
import { FieldError } from '../../shared/ui';

interface Skill {
  slug: string;
  name: string;
}

@Component({
  selector: 'hs-job-form',
  imports: [FormField, FieldError],
  template: `
    <h1>{{ id() ? 'Edit job' : 'Post a job' }}</h1>
    <form (submit)="save($event)">
      <label>Title <input [formField]="jobForm.title" /></label>
      <hs-field-error [show]="jobForm.title().touched() && jobForm.title().invalid()" [errors]="jobForm.title().errors()" />
      <label>Description (markdown) <textarea rows="8" [formField]="jobForm.descriptionMd"></textarea></label>
      <hs-field-error [show]="jobForm.descriptionMd().touched() && jobForm.descriptionMd().invalid()" [errors]="jobForm.descriptionMd().errors()" />
      <label>Type
        <select [formField]="jobForm.employmentType">
          @for (item of types; track item) { <option [value]="item">{{ item }}</option> }
        </select>
      </label>
      <label>Workplace
        <select [formField]="jobForm.workplace">
          @for (item of workplaces; track item) { <option [value]="item">{{ item }}</option> }
        </select>
      </label>
      <label>Location <input [formField]="jobForm.location" /></label>
      <label>Seniority
        <select [formField]="jobForm.seniority">
          @for (item of seniorities; track item) { <option [value]="item">{{ item }}</option> }
        </select>
      </label>
      <label>Salary min <input type="number" [formField]="jobForm.salaryMin" /></label>
      <label>Salary max <input type="number" [formField]="jobForm.salaryMax" /></label>
      <label>Primary skill slug <input [formField]="jobForm.skillSlug" placeholder="angular" /></label>
      <hs-field-error [show]="jobForm().touched() && jobForm().invalid()" [errors]="jobForm().errors()" />
      <button type="submit">Save draft</button>
      @if (id()) {
        <button type="button" (click)="publish()">Publish</button>
        <button type="button" class="ghost" (click)="close()">Close</button>
      }
    </form>
    <p class="muted">Known skills: @for (skill of skills.value(); track skill.slug) { {{ skill.slug }} }</p>
  `,
})
export class JobFormPage {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly types = EMPLOYMENT_TYPES;
  readonly workplaces = WORKPLACES;
  readonly seniorities = SENIORITIES;
  readonly id = signal(this.route.snapshot.paramMap.get('id'));
  readonly skills = httpResource<Skill[]>(() => `${environment.apiUrl}/skills`);
  readonly model = signal({
    title: '',
    descriptionMd: '## About the role\n\nTell candidates what they will ship.',
    employmentType: 'FULL_TIME',
    workplace: 'REMOTE',
    location: '',
    seniority: 'MID',
    salaryMin: 100000,
    salaryMax: 150000,
    skillSlug: 'typescript',
  });
  readonly jobForm = form(this.model, (schema) => {
    required(schema.title, { message: 'Title is required' });
    required(schema.descriptionMd, { message: 'Description is required' });
    validate(schema.salaryMax, ({ value, valueOf }) => {
      if (valueOf(schema.salaryMin) > value()) {
        return { kind: 'salary', message: 'Minimum salary must be less than maximum' };
      }
      return null;
    });
    validate(schema.location, ({ value, valueOf }) => {
      if (valueOf(schema.workplace) !== 'REMOTE' && !value().trim()) {
        return { kind: 'location', message: 'Add a location or choose remote' };
      }
      return null;
    });
  });

  async save(event: Event) {
    event.preventDefault();
    if (this.jobForm().invalid()) return;
    const payload = this.payload();
    try {
      if (this.id()) {
        await firstValueFrom(this.http.patch(`${environment.apiUrl}/jobs/${this.id()}`, payload));
      } else {
        const created = await firstValueFrom(this.http.post<{ id: string }>(`${environment.apiUrl}/jobs`, payload));
        this.id.set(created.id);
      }
      this.toast.show('Job saved', 'success');
      await this.router.navigateByUrl('/employer');
    } catch {
      this.toast.show('Could not save job', 'error');
    }
  }

  async publish() {
    if (!this.id()) return;
    await firstValueFrom(this.http.post(`${environment.apiUrl}/jobs/${this.id()}/publish`, {}));
    this.toast.show('Job published', 'success');
  }

  async close() {
    if (!this.id()) return;
    await firstValueFrom(this.http.post(`${environment.apiUrl}/jobs/${this.id()}/close`, {}));
    this.toast.show('Job closed', 'success');
  }

  private payload() {
    const value = this.model();
    return {
      ...value,
      skills: [{ slug: value.skillSlug, weight: 'REQUIRED' }],
    };
  }
}
