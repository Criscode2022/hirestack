import { Component, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { DomSanitizer } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
import { AuthStore } from '../../core/auth.store';
import { PlatformService } from '../../core/platform.service';
import { ToastService } from '../../core/toast.service';
import { readFeaturedIds } from '../../core/featured-overlay';
import { EmptyState, JobCard, Skeleton, StatusBadge } from '../../shared/ui';
import { renderMarkdown } from '../../shared/markdown';
import { formatCompensation, titleLabel, type PublicJobCard } from '@hirestack/shared';

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
  featured?: boolean;
  company: { ownerId: string; name: string; slug: string; logoUrl: string | null; description: string | null };
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
        <div class="job-card-brand">
          @if (data.company.logoUrl) {
            <img
              class="logo-mark lg"
              [src]="data.company.logoUrl"
              [alt]="data.company.name"
              width="64"
              height="64"
            />
          } @else {
            <span class="logo-mark lg fallback" aria-hidden="true">{{ data.company.name.slice(0, 1) }}</span>
          }
          <div>
            <p class="eyebrow"><a [routerLink]="['/companies', data.company.slug]">{{ data.company.name }}</a></p>
            <div class="job-card-head">
              <h1>{{ data.title }}</h1>
              @if (isFeatured()) { <span class="chip open">Featured</span> }
            </div>
            <p class="meta">{{ label(data.workplace) }} · {{ label(data.employmentType) }} · {{ label(data.seniority) }} @if (data.location) { · {{ data.location }} }</p>
          </div>
        </div>
        <hs-status-badge [status]="data.status" />
        <p class="salary">{{ formatPay(data) }}</p>
        <div class="chips">
          @for (item of data.skills; track item.skill.slug) {
            <span class="chip">{{ item.skill.name }} · {{ label(item.weight) }}</span>
          }
        </div>
        <div class="actions job-cta-bar">
          @if (!auth.ready()) {
            <span class="muted">Checking your session…</span>
          } @else if (auth.hasRole('CANDIDATE')) {
            @if (appliedStatus()) {
              <a class="button" routerLink="/applications">View application</a>
            } @else {
              <a class="button" [routerLink]="['/jobs', data.slug, 'apply']">Apply</a>
            }
            <button type="button" class="ghost" (click)="platform.toggleSaveJob(data.id)">{{ platform.savedJobIds().has(data.id) ? 'Saved' : 'Save job' }}</button>
            <button type="button" class="ghost" (click)="message(data.company.ownerId, data.id)">Message hiring lead</button>
          } @else if (!auth.isAuthenticated()) {
            <a class="button" [routerLink]="['/login']" [queryParams]="{ next: '/jobs/' + data.slug + '/apply' }">Sign in to apply</a>
          } @else if (auth.hasRole('EMPLOYER')) {
            <a class="ghost" routerLink="/employer">Open hiring desk</a>
          }
          <button type="button" class="ghost" (click)="startReport(data.id)">Report</button>
        </div>
        @if (appliedStatus(); as status) {
          <section class="card review-call">
            <h2>You already applied</h2>
            <p class="muted">This role is {{ label(status) }} on your Applications desk.</p>
            <a class="button" routerLink="/applications">View application</a>
          </section>
        }
        @if (data.company.description) {
          <section class="card company-about">
            <p class="eyebrow">About the company</p>
            <h2>{{ data.company.name }}</h2>
            <p>{{ data.company.description }}</p>
            <a class="ghost" [routerLink]="['/companies', data.company.slug]">View company</a>
          </section>
        }
        @if (reportingId() === data.id) {
          <form class="card report-box" (submit)="submitReport($event)">
            <label>
              Why are you reporting this job?
              <textarea rows="3" [value]="reportReason()" (input)="reportReason.set($any($event.target).value)" maxlength="500"></textarea>
            </label>
            <div class="cta-row">
              <button type="submit" [disabled]="reportBusy() || !reportReason().trim()">Submit report</button>
              <button type="button" class="ghost" (click)="cancelReport()">Cancel</button>
            </div>
          </form>
        }
        <section class="prose" [innerHTML]="html(data.descriptionMd)"></section>
      </article>
      <section>
        <h2>Similar jobs</h2>
      @if (!data.similar.length) {
        <hs-empty-state title="No similar jobs" message="Browse the full board for more roles.">
          <a routerLink="/jobs" class="ghost">Open jobs</a>
        </hs-empty-state>
      } @else {
        <div class="grid">
          @for (item of data.similar; track item.id) {
            <hs-job-card [job]="item" />
          }
        </div>
      }
      </section>
    }
  `,
})
export class JobDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  readonly auth = inject(AuthStore);
  readonly platform = inject(PlatformService);
  readonly reportingId = signal<string | null>(null);
  readonly reportReason = signal('');
  readonly reportBusy = signal(false);
  readonly job = httpResource<JobDetail>(() => {
    const slug = this.route.snapshot.paramMap.get('slug');
    return slug ? `${environment.apiUrl}/jobs/${slug}` : undefined;
  });

  html(md: string) {
    return this.sanitizer.bypassSecurityTrustHtml(renderMarkdown(md));
  }

  label(value: string) {
    return titleLabel(value);
  }

  formatPay(data: Pick<JobDetail, 'salaryMin' | 'salaryMax' | 'currency' | 'employmentType'>) {
    return formatCompensation(data.salaryMin, data.salaryMax, data.currency, data.employmentType);
  }

  isFeatured() {
    const data = this.job.value();
    return Boolean(data?.featured) || Boolean(data && readFeaturedIds().includes(data.id));
  }

  appliedStatus() {
    const data = this.job.value();
    return data ? this.platform.appliedJobs().get(data.id) ?? null : null;
  }

  async message(userId: string, jobId: string) {
    try {
      const conversation = await firstValueFrom(
        this.http.post<{ id: string }>(`${environment.apiUrl}/conversations`, { userId, jobId }),
      );
      await this.router.navigate(['/messages', conversation.id]);
    } catch {
      this.toast.show('Could not open that thread', 'error');
    }
  }

  startReport(id: string) {
    this.reportingId.set(id);
    this.reportReason.set('');
  }

  cancelReport() {
    this.reportingId.set(null);
    this.reportReason.set('');
  }

  async submitReport(event: Event) {
    event.preventDefault();
    const id = this.reportingId();
    const reason = this.reportReason().trim();
    if (!id || !reason) {
      return;
    }
    this.reportBusy.set(true);
    try {
      await firstValueFrom(this.http.post(`${environment.apiUrl}/jobs/${id}/report`, { reason }));
      this.toast.show('Report submitted', 'success');
      this.cancelReport();
    } catch {
      this.toast.show('Could not submit report', 'error');
    } finally {
      this.reportBusy.set(false);
    }
  }
}
