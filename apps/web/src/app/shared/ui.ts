import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ApplicationStatus, PublicJobCard } from '@hirestack/shared';

@Component({
  selector: 'hs-empty-state',
  template: `
    <div class="empty">
      <h3>{{ title() }}</h3>
      <p>{{ message() }}</p>
      <ng-content />
    </div>
  `,
  styles: [`
    .empty { padding: 2.5rem 1rem; text-align: center; color: var(--muted); }
    h3 { color: var(--text); margin-bottom: .4rem; }
  `],
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
    .bar { border-radius: 10px; background: linear-gradient(90deg, var(--elev-2), var(--elev-3), var(--elev-2)); background-size: 200% 100%; animation: shimmer 1.2s infinite; }
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
    <span class="badge" [attr.data-status]="status()">{{ status() }}</span>
  `,
  styles: [`
    .badge { display: inline-flex; align-items: center; border-radius: 999px; padding: .15rem .6rem; font-size: .72rem; font-weight: 650; letter-spacing: .03em; }
    .badge[data-status='PUBLISHED'], .badge[data-status='HIRED'], .badge[data-status='ACTIVE'] { background: #123d2a; color: #8ef0b5; }
    .badge[data-status='DRAFT'], .badge[data-status='REVIEWING'] { background: #3d3512; color: #f0d48e; }
    .badge[data-status='CLOSED'], .badge[data-status='REJECTED'], .badge[data-status='SUSPENDED'] { background: #3d1218; color: #f08e9d; }
    .badge[data-status='SUBMITTED'] { background: #12243d; color: #8ec5f0; }
    .badge[data-status='INTERVIEW'], .badge[data-status='OFFER'] { background: #2c123d; color: #d89ef0; }
    .badge[data-status='WITHDRAWN'] { background: var(--elev-3); color: var(--muted); }
  `],
})
export class StatusBadge {
  readonly status = input.required<ApplicationStatus | string>();
}

@Component({
  selector: 'hs-job-card',
  imports: [RouterLink],
  template: `
    <article class="card">
      <a [routerLink]="['/jobs', job().slug]" class="title">{{ job().title }}</a>
      <p class="meta">
        <a [routerLink]="['/companies', job().company.slug]">{{ job().company.name }}</a>
        · {{ job().workplace }}
        @if (job().location) { · {{ job().location }} }
      </p>
      <p class="salary">{{ salary() }}</p>
      <div class="chips">
        @for (skill of job().skills.slice(0, 4); track skill.slug) {
          <span class="chip">{{ skill.name }}</span>
        }
      </div>
      @if (saved() !== null) {
        <button type="button" class="ghost" (click)="toggleSave.emit()">
          {{ saved() ? 'Saved' : 'Save' }}
        </button>
      }
    </article>
  `,
  styles: [`
    .card { display: grid; gap: .4rem; padding: 1.1rem 1.15rem; border: 1px solid var(--border); border-radius: var(--radius); background: var(--elev); }
    .title { font-weight: 700; font-size: 1.05rem; color: var(--text); }
    .meta, .salary { color: var(--muted); font-size: .9rem; }
    .chips { display: flex; flex-wrap: wrap; gap: .35rem; }
    .chip { background: var(--elev-2); border-radius: 999px; padding: .15rem .55rem; font-size: .75rem; }
    .ghost { justify-self: start; }
  `],
})
export class JobCard {
  readonly job = input.required<PublicJobCard>();
  readonly saved = input<boolean | null>(null);
  readonly toggleSave = output<void>();

  salary() {
    const job = this.job();
    if (job.salaryMin == null && job.salaryMax == null) {
      return 'Salary not listed';
    }
    const min = job.salaryMin?.toLocaleString() ?? '?';
    const max = job.salaryMax?.toLocaleString() ?? '?';
    return `${job.currency} ${min}–${max}`;
  }
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
  styles: [`.errors { color: #f08e9d; font-size: .8rem; margin: .25rem 0 0; padding-left: 1rem; }`],
})
export class FieldError {
  readonly show = input(false);
  readonly errors = input<Array<{ message?: string }>>([]);
}
