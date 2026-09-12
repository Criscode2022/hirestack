import { Component, effect, inject, signal } from '@angular/core';
import { FormField, form, maxLength, required } from '@angular/forms/signals';
import { httpResource } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../core/toast.service';
import { EmptyState, FieldError, Skeleton } from '../../shared/ui';
import { uploadCandidateResume, resumeUploadErrorMessage, uploadsArePaused } from '../../shared/resume-upload';

interface Resume {
  id: string;
  fileName: string;
  isCurrent: boolean;
}

@Component({
  selector: 'hs-apply',
  imports: [FormField, FieldError, EmptyState, RouterLink, Skeleton],
  template: `
    <header class="page-head">
      <div>
        <p class="eyebrow">Application</p>
        <h1>Apply</h1>
        <p class="lede">
          @if (job.value(); as data) {
            {{ data.title }} at {{ data.company.name }}. One resume, a short note, and you are in their inbox.
          } @else {
            One resume, a short note, and you are in their inbox.
          }
        </p>
      </div>
    </header>
    @if (job.error()) {
      <hs-empty-state title="Job not found" message="This role may have closed. Browse open jobs and apply from there.">
        <a routerLink="/jobs" class="ghost">Open jobs</a>
      </hs-empty-state>
    } @else if (resumes.isLoading() || job.isLoading()) {
      <hs-skeleton [rows]="[1, 2]" [height]="88" />
    } @else if (resumes.error()) {
      <hs-empty-state title="Could not load resumes" message="Sign in again, then retry this application." />
    } @else {
      <form class="card" (submit)="submit($event)">
        @if (uploadsPaused()) {
          <p class="form-alert">{{
            resumes.value()?.length
              ? 'New PDF uploads are paused. Pick a resume already on file.'
              : 'New PDF uploads are paused. You need a resume already on file to apply.'
          }}</p>
        }
        <label class="file-drop" [class.is-paused]="uploadsPaused()">
          <input type="file" accept="application/pdf" (change)="upload($event)" [disabled]="uploading() || uploadsPaused()" />
          <strong>{{ uploading() ? 'Uploading…' : 'Drop a PDF or browse' }}</strong>
          <span class="muted">{{ uploadsPaused() ? 'New uploads are paused. 5MB max when they return.' : 'Required to apply. 5MB max.' }}</span>
        </label>
        @if (resumes.value()?.length) {
          <label>
            Resume
            <select [formField]="applyForm.resumeId">
              <option value="">Select a resume</option>
              @for (resume of resumes.value(); track resume.id) {
                <option [value]="resume.id">{{ resume.fileName }} @if (resume.isCurrent) { (current) }</option>
              }
            </select>
          </label>
          <hs-field-error [show]="applyForm.resumeId().touched() && applyForm.resumeId().invalid()" [errors]="applyForm.resumeId().errors()" />
        } @else if (uploadsPaused()) {
          <p class="muted">You need a resume already on file until uploads are connected.</p>
        } @else {
          <p class="muted">Upload a PDF above, then send the application from this page.</p>
        }
        <label>
          Cover letter
          <textarea rows="6" [formField]="applyForm.coverLetter"></textarea>
        </label>
        <hs-field-error [show]="applyForm.coverLetter().touched() && applyForm.coverLetter().invalid()" [errors]="applyForm.coverLetter().errors()" />
        <div class="cta-row">
          <button type="submit" [disabled]="pending() || uploading() || !model().resumeId">
            {{ pending() ? 'Submitting…' : 'Submit application' }}
          </button>
        </div>
      </form>
    }
  `,
})
export class ApplyPage {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly pending = signal(false);
  readonly uploading = signal(false);
  readonly resumes = httpResource<Resume[]>(() => `${environment.apiUrl}/me/resumes`);
  readonly health = httpResource<{ hasBlob?: boolean }>(() => `${environment.apiUrl}/health`);
  readonly job = httpResource<{ title: string; company: { name: string } }>(() => {
    const slug = this.route.snapshot.paramMap.get('slug');
    return slug ? `${environment.apiUrl}/jobs/${slug}` : undefined;
  });
  readonly model = signal({ resumeId: '', coverLetter: '' });
  readonly applyForm = form(this.model, (schema) => {
    required(schema.resumeId, { message: 'Choose a resume' });
    maxLength(schema.coverLetter, 2000, { message: 'Cover letter must be 2000 characters or fewer' });
  });

  constructor() {
    effect(() => {
      const list = this.resumes.value();
      if (!list?.length || this.model().resumeId) {
        return;
      }
      const current = list.find((resume) => resume.isCurrent) ?? list[0];
      this.model.update((model) => ({ ...model, resumeId: current.id }));
    });
  }

  uploadsPaused() {
    return uploadsArePaused(this.health.value()?.hasBlob);
  }

  async upload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    this.uploading.set(true);
    try {
      await uploadCandidateResume(this.http, file);
      this.resumes.reload();
      this.model.update((model) => ({ ...model, resumeId: '' }));
      this.toast.show('Resume uploaded', 'success');
    } catch {
      this.toast.show(resumeUploadErrorMessage(this.health.value()?.hasBlob), 'error');
    } finally {
      this.uploading.set(false);
      input.value = '';
    }
  }

  async submit(event: Event) {
    event.preventDefault();
    if (this.applyForm().invalid()) {
      return;
    }
    this.pending.set(true);
    try {
      const slug = this.route.snapshot.paramMap.get('slug');
      const job = await firstValueFrom(this.http.get<{ id: string }>(`${environment.apiUrl}/jobs/${slug}`));
      await firstValueFrom(this.http.post(`${environment.apiUrl}/jobs/${job.id}/applications`, this.model()));
      this.toast.show('Application submitted', 'success');
      await this.router.navigateByUrl('/applications');
    } catch (error: unknown) {
      const message = error && typeof error === 'object' && 'error' in error
        ? JSON.stringify((error as { error: unknown }).error)
        : 'Could not apply';
      this.toast.show(message.includes('already applied') ? 'You already applied to this job' : 'Could not apply', 'error');
    } finally {
      this.pending.set(false);
    }
  }
}
