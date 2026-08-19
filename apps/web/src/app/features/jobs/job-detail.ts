import { Component, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { DomSanitizer } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
import { AuthStore } from '../../core/auth.store';
import { ToastService } from '../../core/toast.service';
import { EmptyState, JobCard, Skeleton, StatusBadge } from '../../shared/ui';
import { renderMarkdown } from '../../shared/markdown';
import type { PublicJobCard } from '@hirestack/shared';

interface JobDetail {
  id: string;
  slug: string;
  title: string;
  descriptionMd: string;
  location: string | null;
  workplace: string;
  employmentType: string;
  seniority: string;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  status: string;
  company: { name: string; slug: string; logoUrl: string | null; description: string | null };
  skills: Array<{ weight: string; skill: { slug: string; name: string } }>;
  similar: PublicJobCard[];
}

@Component({
  selector: 'hs-job-detail',
  imports: [RouterLink, JobCard, Skeleton, EmptyState, StatusBadge],
  template: `
    @if (job.isLoading()) {
      <hs-skeleton [rows]="[1,2,3]" [height]="140" />
    } @else if (job.error() || !job.value()) {
      <hs-empty-state title="Job not found" message="It may have been unpublished." />
    } @else {
      @let data = job.value()!;
      <article class="detail">
        <p class="eyebrow"><a [routerLink]="['/companies', data.company.slug]">{{ data.company.name }}</a></p>
        <h1>{{ data.title }}</h1>
        <p class="meta">{{ data.workplace }} · {{ data.employmentType }} · {{ data.seniority }} @if (data.location) { · {{ data.location }} }</p>
        <hs-status-badge [status]="data.status" />
        <p class="salary">
          @if (data.salaryMin != null) { {{ data.currency }} {{ data.salaryMin.toLocaleString() }}–{{ data.salaryMax?.toLocaleString() }} }
          @else { Salary not listed }
        </p>
        <div class="chips">
          @for (item of data.skills; track item.skill.slug) {
            <span class="chip">{{ item.skill.name }} · {{ item.weight }}</span>
          }
        </div>
        <div class="actions">
          @if (auth.hasRole('CANDIDATE')) {
            <a class="button" [routerLink]="['/jobs', data.slug, 'apply']">Apply</a>
            <button type="button" class="ghost" (click)="toggleSave(data.id)">{{ saved() ? 'Saved' : 'Save job' }}</button>
          } @else {
            <a class="button" routerLink="/login">Sign in to apply</a>
          }
          <button type="button" class="ghost" (click)="report(data.id)">Report</button>
        </div>
        <section class="prose" [innerHTML]="html(data.descriptionMd)"></section>
      </article>
      <section>
        <h2>Similar jobs</h2>
        <div class="grid">
          @for (item of data.similar; track item.id) {
            <hs-job-card [job]="item" />
          }
        </div>
      </section>
    }
  `,
})
export class JobDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthStore);
  readonly saved = signal(false);
  readonly job = httpResource<JobDetail>(() => {
    const slug = this.route.snapshot.paramMap.get('slug');
    return slug ? `${environment.apiUrl}/jobs/${slug}` : undefined;
  });

  html(md: string) {
    return this.sanitizer.bypassSecurityTrustHtml(renderMarkdown(md));
  }

  async toggleSave(id: string) {
    const previous = this.saved();
    this.saved.set(!previous);
    try {
      if (previous) {
        await firstValueFrom(this.http.delete(`${environment.apiUrl}/jobs/${id}/save`));
      } else {
        await firstValueFrom(this.http.post(`${environment.apiUrl}/jobs/${id}/save`, {}));
      }
    } catch {
      this.saved.set(previous);
      this.toast.show('Could not update saved job', 'error');
    }
  }

  async report(id: string) {
    const reason = prompt('Why are you reporting this job?');
    if (!reason) return;
    try {
      await firstValueFrom(this.http.post(`${environment.apiUrl}/jobs/${id}/report`, { reason }));
      this.toast.show('Report submitted', 'success');
    } catch {
      this.toast.show('Could not submit report', 'error');
    }
  }
}
