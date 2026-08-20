import { Component, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../core/toast.service';
import { EmptyState, Skeleton, StatusBadge } from '../../shared/ui';

interface ApplicationRow {
  id: string;
  status: string;
  createdAt: string;
  job: { slug: string; title: string; company: { name: string } };
  events: Array<{ id: string; toStatus: string; note: string | null; createdAt: string; isPublic: boolean }>;
}

@Component({
  selector: 'hs-tracker',
  imports: [RouterLink, StatusBadge, Skeleton, EmptyState],
  template: `
    <header class="page-head">
      <div>
        <p class="eyebrow">Pipeline</p>
        <h1>Applications</h1>
        <p class="lede">Every status change is legal and visible. No silent jumps.</p>
      </div>
    </header>
    @if (apps.isLoading()) {
      <hs-skeleton />
    } @else if (!apps.value()?.length) {
      <hs-empty-state title="No applications" message="Find a role and apply with your current resume." />
    } @else {
      <div class="stack">
        @for (app of apps.value(); track app.id) {
          <article class="card">
            <a [routerLink]="['/jobs', app.job.slug]"><strong>{{ app.job.title }}</strong></a>
            <p>{{ app.job.company.name }}</p>
            <hs-status-badge [status]="app.status" />
            <ol class="timeline">
              @for (event of app.events; track event.id) {
                <li>
                  <hs-status-badge [status]="event.toStatus" />
                  @if (event.note) { <p>{{ event.note }}</p> }
                </li>
              }
            </ol>
            @switch (app.status) {
              @case ('SUBMITTED') {
                <button type="button" (click)="withdraw(app.id)">Withdraw</button>
              }
              @case ('REVIEWING') {
                <button type="button" (click)="withdraw(app.id)">Withdraw</button>
              }
              @case ('INTERVIEW') { <p>Interview in progress</p> }
              @case ('OFFER') { <p>Offer extended</p> }
              @case ('HIRED') { <p>Hired</p> }
              @case ('REJECTED') { <p>Closed</p> }
              @case ('WITHDRAWN') { <p>Withdrawn</p> }
              @default { never; }
            }
          </article>
        }
      </div>
    }
  `,
})
export class TrackerPage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  readonly apps = httpResource<ApplicationRow[]>(() => `${environment.apiUrl}/me/applications`);

  async withdraw(id: string) {
    try {
      await firstValueFrom(this.http.post(`${environment.apiUrl}/applications/${id}/withdraw`, {}));
      this.apps.reload();
      this.toast.show('Application withdrawn', 'success');
    } catch {
      this.toast.show('Cannot withdraw from this stage', 'error');
    }
  }
}
