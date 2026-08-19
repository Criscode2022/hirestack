import { Component, inject, signal } from '@angular/core';
import { FormField, form, maxLength, required } from '@angular/forms/signals';
import { httpResource } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../core/toast.service';
import { FieldError } from '../../shared/ui';

interface Resume {
  id: string;
  fileName: string;
  isCurrent: boolean;
}

@Component({
  selector: 'hs-apply',
  imports: [FormField, FieldError],
  template: `
    <h1>Apply</h1>
    <form (submit)="submit($event)">
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
      <label>
        Cover letter
        <textarea rows="6" [formField]="applyForm.coverLetter"></textarea>
      </label>
      <hs-field-error [show]="applyForm.coverLetter().touched() && applyForm.coverLetter().invalid()" [errors]="applyForm.coverLetter().errors()" />
      <button type="submit" [disabled]="pending()">Submit application</button>
    </form>
  `,
})
export class ApplyPage {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly pending = signal(false);
  readonly resumes = httpResource<Resume[]>(() => `${environment.apiUrl}/me/resumes`);
  readonly model = signal({ resumeId: '', coverLetter: '' });
  readonly applyForm = form(this.model, (schema) => {
    required(schema.resumeId, { message: 'Choose a resume' });
    maxLength(schema.coverLetter, 2000, { message: 'Cover letter must be 2000 characters or fewer' });
  });

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
