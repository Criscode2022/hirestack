import { Component, inject, signal } from '@angular/core';
import { FormField, form, required, validate } from '@angular/forms/signals';
import { HttpClient, HttpErrorResponse, httpResource } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { EMPLOYMENT_TYPES, SENIORITIES, WORKPLACES } from '@hirestack/shared';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../core/toast.service';
import { PlatformService } from '../../core/platform.service';
import { EmptyState, FieldError, Skeleton, StatusBadge } from '../../shared/ui';

interface Skill {
  slug: string;
  name: string;
}

interface OwnedJob {
  id: string;
  slug: string;
  title: string;
  descriptionMd: string;
  employmentType: string;
  workplace: string;
  location: string | null;
  seniority: string;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  status: string;
  featured?: boolean;
  skills: Array<{ slug?: string; weight?: string; skill?: { slug: string; name?: string } }>;
}

interface WorkspaceBilling {
  planName: string;
  canPublish: boolean;
  usage: { publishedJobs: number; publishedLimit: number | null; featuredJobs: number; featuredLimit: number };
}

@Component({
  selector: 'hs-job-form',
  imports: [FormField, FieldError, RouterLink, Skeleton, EmptyState, StatusBadge],
  template: `
    <header class="page-head">
      <div>
        <p class="eyebrow">Hiring</p>
        <h1>{{ id() ? 'Edit job' : 'Post a job' }}</h1>
        <p class="lede">Write it like a person. Publish when the draft is ready.</p>
        @if (billing.value(); as bill) {
          <p class="muted">{{ bill.planName }} · {{ bill.usage.publishedJobs }}/{{ bill.usage.publishedLimit ?? '∞' }} published · {{ bill.usage.featuredJobs }}/{{ bill.usage.featuredLimit }} featured</p>
        }
      </div>
      @if (slug()) {
        <a class="ghost" [routerLink]="['/jobs', slug()]">View public page</a>
      }
    </header>
    @if (billing.value() && !billing.value()!.canPublish && status() !== 'PUBLISHED') {
      <hs-empty-state title="Published limit reached" message="Upgrade the workspace plan to put another role live.">
        <a routerLink="/employer/billing" class="button">Manage billing</a>
      </hs-empty-state>
    }
    @if (loading()) {
      <hs-skeleton />
    } @else if (loadError()) {
      <hs-empty-state title="Could not load this job" message="It may have been removed, or you may need to sign in again.">
        <a routerLink="/employer" class="ghost">Back to pipeline</a>
      </hs-empty-state>
    } @else {
      <form class="card" (submit)="save($event)">
        @if (status()) {
          <hs-status-badge [status]="status()!" />
        }
        <label>Title <input [formField]="jobForm.title" /></label>
        <hs-field-error [show]="jobForm.title().touched() && jobForm.title().invalid()" [errors]="jobForm.title().errors()" />
        <label>Description (markdown) <textarea rows="8" [formField]="jobForm.descriptionMd"></textarea></label>
        <hs-field-error [show]="jobForm.descriptionMd().touched() && jobForm.descriptionMd().invalid()" [errors]="jobForm.descriptionMd().errors()" />
        <div class="fields-2">
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
        </div>
        <label>Primary skill</label>
        <div class="chips">
          @for (skill of skills.value(); track skill.slug) {
            <button
              type="button"
              class="chip quick"
              [class.active]="model().skillSlug === skill.slug"
              (click)="pickSkill(skill.slug)"
            >{{ skill.name }}</button>
          }
        </div>
        <p class="muted">Primary skill: {{ model().skillSlug }}</p>
        <hs-field-error [show]="jobForm().touched() && jobForm().invalid()" [errors]="jobForm().errors()" />
        <div class="cta-row">
          <button type="submit">Save draft</button>
          @if (id()) {
            <button type="button" [disabled]="atPublishCap()" (click)="publish()">Publish</button>
            <button type="button" class="ghost" (click)="close()">Close</button>
          }
        </div>
      </form>
    }
  `,
})
export class JobFormPage {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly platform = inject(PlatformService);
  readonly types = EMPLOYMENT_TYPES;
  readonly workplaces = WORKPLACES;
  readonly seniorities = SENIORITIES;
  readonly id = signal(this.route.snapshot.paramMap.get('id'));
  readonly slug = signal<string | null>(null);
  readonly status = signal<string | null>(null);
  readonly loading = signal(Boolean(this.route.snapshot.paramMap.get('id')));
  readonly loadError = signal(false);
  readonly skills = httpResource<Skill[]>(() => `${environment.apiUrl}/skills`);
  readonly billing = httpResource<WorkspaceBilling>(() => `${environment.apiUrl}/billing/workspace`);
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

  constructor() {
    const id = this.id();
    if (id) {
      void this.load(id);
    }
  }

  atPublishCap() {
    const bill = this.billing.value();
    return Boolean(bill && !bill.canPublish && this.status() !== 'PUBLISHED');
  }

  async load(id: string) {
    this.loading.set(true);
    this.loadError.set(false);
    try {
      const job = await firstValueFrom(this.http.get<OwnedJob>(`${environment.apiUrl}/me/jobs/${id}`));
      this.slug.set(job.slug);
      this.status.set(job.status);
      this.model.set({
        title: job.title,
        descriptionMd: job.descriptionMd || '## About the role\n\nTell candidates what they will ship.',
        employmentType: job.employmentType || 'FULL_TIME',
        workplace: job.workplace || 'REMOTE',
        location: job.location ?? '',
        seniority: job.seniority || 'MID',
        salaryMin: job.salaryMin ?? 0,
        salaryMax: job.salaryMax ?? 0,
        skillSlug: this.primarySkill(job.skills),
      });
    } catch {
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  }

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
    try {
      await firstValueFrom(this.http.post(`${environment.apiUrl}/jobs/${this.id()}/publish`, {}));
      this.status.set('PUBLISHED');
      void this.platform.refreshWorkspace();
      this.toast.show('Job published', 'success');
    } catch (error) {
      const message =
        error instanceof HttpErrorResponse && typeof error.error?.message === 'string'
          ? error.error.message
          : 'Upgrade your plan to publish more jobs';
      this.toast.show(message, 'error');
    }
  }

  async close() {
    if (!this.id()) return;
    try {
      await firstValueFrom(this.http.post(`${environment.apiUrl}/jobs/${this.id()}/close`, {}));
      this.status.set('CLOSED');
      void this.platform.refreshWorkspace();
      this.toast.show('Job closed', 'success');
    } catch {
      this.toast.show('Could not close this job', 'error');
    }
  }

  pickSkill(slug: string) {
    this.model.update((model) => ({ ...model, skillSlug: slug }));
  }

  private primarySkill(skills: OwnedJob['skills'] | undefined) {
    const first = skills?.[0];
    return first?.slug || first?.skill?.slug || 'typescript';
  }

  private payload() {
    const value = this.model();
    return {
      title: value.title,
      descriptionMd: value.descriptionMd,
      employmentType: value.employmentType,
      workplace: value.workplace,
      location: value.location.trim() || undefined,
      seniority: value.seniority,
      salaryMin: Number(value.salaryMin),
      salaryMax: Number(value.salaryMax),
      skills: [{ slug: value.skillSlug, weight: 'REQUIRED' as const }],
    };
  }
}
