import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ApplicationStatus, PublicJobCard, PublicPersonCard } from '@hirestack/shared';
import { AuthStore } from '../core/auth.store';
import { PlatformService } from '../core/platform.service';
import { readFeaturedIds } from '../core/featured-overlay';
import { initials } from './time';

@Component({
  selector: 'hs-empty-state',
  template: `
    <div class="empty">
      <h3>{{ title() }}</h3>
      <p>{{ message() }}</p>
      <ng-content />
    </div>
  `,
})
export class EmptyState {
  readonly title = input('Nothing here yet');
  readonly message = input('Try adjusting filters or come back later.');
}

@Component({
  selector: 'hs-skeleton',
  template: `
    <div class="stack" role="status" aria-live="polite" aria-label="Loading">
      @for (row of rows(); track row) {
        <div class="bar" [style.height.px]="height()"></div>
      }
    </div>
  `,
  styles: [`
    .stack { display: grid; gap: .75rem; }
    .bar { border-radius: 16px; background: linear-gradient(90deg, var(--elev-2), var(--elev-3), var(--elev-2)); background-size: 200% 100%; animation: shimmer 1.2s infinite; }
    @keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
  `],
})
export class Skeleton {
  readonly rows = input([1, 2, 3]);
  readonly height = input(88);
}

@Component({
  selector: 'hs-status-badge',
  template: `
    <span class="badge" [attr.data-status]="status()">{{ label() }}</span>
  `,
  styles: [`
    .badge { display: inline-flex; align-items: center; border-radius: 999px; padding: .18rem .65rem; font-size: .74rem; font-weight: 750; letter-spacing: .02em; background: var(--mist); color: var(--ink); }
    .badge[data-status='PUBLISHED'], .badge[data-status='HIRED'], .badge[data-status='ACTIVE'] { background: color-mix(in oklab, var(--leaf) 34%, var(--card)); color: var(--sage); }
    .badge[data-status='DRAFT'], .badge[data-status='REVIEWING'] { background: color-mix(in oklab, var(--gold) 30%, var(--card)); color: #7a5420; }
    .badge[data-status='CLOSED'], .badge[data-status='REJECTED'], .badge[data-status='SUSPENDED'] { background: color-mix(in oklab, var(--rose) 22%, var(--card)); color: var(--rose); }
    .badge[data-status='SUBMITTED'] { background: color-mix(in oklab, var(--mist) 80%, white); }
    .badge[data-status='INTERVIEW'], .badge[data-status='OFFER'] { background: color-mix(in oklab, var(--clay) 20%, var(--card)); color: var(--clay); }
    .badge[data-status='WITHDRAWN'] { background: var(--elev-3); color: var(--muted); }
  `],
})
export class StatusBadge {
  readonly status = input.required<ApplicationStatus | string>();
  readonly label = computed(() =>
    this.status()
      .toLowerCase()
      .replaceAll('_', ' ')
      .replace(/^\w/, (c) => c.toUpperCase()),
  );
}

@Component({
  selector: 'hs-job-card',
  imports: [RouterLink],
  template: `
    <article class="job-card">
      @if (isFeatured()) {
        <span class="chip open">Featured</span>
      }
      @if (job().matchPercent != null) {
        <span class="match">{{ job().matchPercent }}% match</span>
      }
      <a [routerLink]="['/jobs', job().slug]" class="title">{{ job().title }}</a>
      <p class="meta">
        <a [routerLink]="['/companies', job().company.slug]">{{ job().company.name }}</a>
        · {{ place() }}
      </p>
      <p class="salary">{{ salary() }}</p>
      <div class="chips">
        @for (skill of job().skills.slice(0, 4); track skill.slug) {
          <span class="chip">{{ skill.name }}</span>
        }
      </div>
      @if (canSave()) {
        <button type="button" class="ghost" (click)="save()">
          {{ isSaved() ? 'Saved' : 'Save' }}
        </button>
      }
    </article>
  `,
})
export class JobCard {
  private readonly auth = inject(AuthStore);
  private readonly platform = inject(PlatformService);
  readonly job = input.required<PublicJobCard>();
  readonly canSave = computed(() => this.auth.hasRole('CANDIDATE'));
  readonly isSaved = computed(() => this.platform.savedJobIds().has(this.job().id));
  readonly isFeatured = computed(
    () => Boolean(this.job().featured) || readFeaturedIds().includes(this.job().id),
  );

  place() {
    const job = this.job();
    const work = job.workplace.toLowerCase();
    return job.location ? `${work} · ${job.location}` : work;
  }

  salary() {
    const job = this.job();
    if (job.salaryMin == null && job.salaryMax == null) {
      return 'Salary not listed';
    }
    const min = job.salaryMin?.toLocaleString() ?? '?';
    const max = job.salaryMax?.toLocaleString() ?? '?';
    return `${job.currency} ${min}–${max}`;
  }

  save() {
    void this.platform.toggleSaveJob(this.job().id);
  }
}

@Component({
  selector: 'hs-person-card',
  imports: [RouterLink],
  template: `
    <article class="person-card">
      <div class="person-row">
        <span class="avatar">{{ initials(person().name) }}</span>
        <div>
          <a [routerLink]="['/people', person().id]" class="title">{{ person().name }}</a>
          <p class="muted">{{ person().headline }}</p>
        </div>
      </div>
      <p class="meta">
        {{ person().location }}
        @if (person().openToWork) { · <span class="chip open">Open to work</span> }
      </p>
      <div class="chips">
        @for (skill of person().skills.slice(0, 4); track skill.slug) {
          <span class="chip">{{ skill.name }}</span>
        }
      </div>
      @if (showConnect() && auth.isAuthenticated() && person().id !== auth.user()?.id) {
        <button type="button" class="ghost" [disabled]="busy() || sent()" (click)="connect.emit()">
          {{ sent() ? 'Requested' : 'Connect' }}
        </button>
      }
    </article>
  `,
})
export class PersonCard {
  readonly auth = inject(AuthStore);
  readonly person = input.required<PublicPersonCard>();
  readonly showConnect = input(false);
  readonly sent = input(false);
  readonly busy = input(false);
  readonly connect = output<void>();
  readonly initials = initials;
}

@Component({
  selector: 'hs-field-error',
  template: `
    @if (show()) {
      <ul class="errors">
        @for (error of errors(); track error.message) {
          <li>{{ error.message }}</li>
        }
      </ul>
    }
  `,
  styles: [`.errors { color: var(--rose); font-size: .8rem; margin: .25rem 0 0; padding-left: 1rem; }`],
})
export class FieldError {
  readonly show = input(false);
  readonly errors = input<Array<{ message?: string }>>([]);
}
