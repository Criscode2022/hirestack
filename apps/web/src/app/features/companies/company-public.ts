import { Component, effect, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthStore } from '../../core/auth.store';
import { ToastService } from '../../core/toast.service';
import { EmptyState, JobCard, Skeleton } from '../../shared/ui';
import { initials } from '../../shared/time';
import { isNotFoundError } from '../../shared/resource';
import type { PublicJobCard } from '@hirestack/shared';

interface CompanyDetail {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  description: string | null;
  logoUrl: string | null;
  industry: string | null;
  headquarters: string | null;
  employeeCount: number | null;
  foundedYear: number | null;
  owner?: { id: string; name: string; headline: string | null } | null;
  _count?: { followers: number };
  jobs: PublicJobCard[];
}

@Component({
  selector: 'hs-company-public',
  imports: [JobCard, Skeleton, EmptyState, RouterLink],
  template: `
    @if (company.isLoading()) {
      <hs-skeleton />
    } @else if (company.error() && !isMissing()) {
      <hs-empty-state title="Could not load this company" message="Retry in a moment. The public page comes back when the API is reachable." />
    } @else if (isMissing() || !company.value()) {
      <hs-empty-state title="Company not found" message="The profile may have been removed." />
    } @else {
      @let data = company.value()!;
      <header class="page-head">
        <div class="company-hero">
          @if (data.logoUrl) {
            <img class="logo-mark lg" [src]="data.logoUrl" [alt]="data.name" width="64" height="64" loading="lazy" decoding="async" />
          } @else {
            <span class="logo-mark lg fallback" aria-hidden="true">{{ data.name.slice(0, 1) }}</span>
          }
          <div>
            <p class="eyebrow">{{ data.industry }} @if (data.headquarters) { · {{ data.headquarters }} }</p>
            <h1>{{ data.name }}</h1>
            <p class="muted">{{ data._count?.followers ?? 0 }} followers @if (data.employeeCount) { · {{ data.employeeCount }} people } @if (data.foundedYear) { · Est. {{ data.foundedYear }} }</p>
          </div>
        </div>
        @if (data.website) { <a class="ghost" [href]="data.website" rel="noreferrer" target="_blank">Website</a> }
        @if (auth.isAuthenticated()) {
          <button type="button" class="ghost" [disabled]="followBusy()" (click)="toggleFollow(data.id)">
            {{ following() ? 'Following' : 'Follow' }}
          </button>
        } @else {
          <a class="ghost" routerLink="/login" [queryParams]="{ next: '/companies/' + data.slug }">Sign in to follow</a>
        }
      </header>
      @if (data.description) {
        <p class="lede">{{ data.description }}</p>
      }
      @if (data.owner) {
        <section class="card review-call hiring-lead">
          <div class="person-row">
            <span class="avatar">{{ initials(data.owner.name) }}</span>
            <div>
              <p class="eyebrow">Hiring lead</p>
              <p><a [routerLink]="['/people', data.owner.id]"><strong>{{ data.owner.name }}</strong></a></p>
              @if (data.owner.headline) {
                <p class="muted">{{ data.owner.headline }}</p>
              }
            </div>
            @if (auth.isAuthenticated()) {
              <button type="button" class="ghost" (click)="message(data.owner.id)">Message hiring lead</button>
            }
          </div>
        </section>
      }
      <h2>Open roles</h2>
      @if (!data.jobs.length) {
        <hs-empty-state title="No open roles" message="This team has not published a job yet." />
      } @else {
        <div class="grid">
          @for (job of data.jobs; track job.id) {
            <hs-job-card [job]="job" />
          }
        </div>
      }
    }
  `,
})
export class CompanyPublicPage {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  readonly auth = inject(AuthStore);
  private readonly toast = inject(ToastService);
  readonly initials = initials;
  readonly following = signal(false);
  readonly followBusy = signal(false);
  readonly company = httpResource<CompanyDetail>(() => {
    const slug = this.route.snapshot.paramMap.get('slug');
    return slug ? `${environment.apiUrl}/companies/${slug}` : undefined;
  });

  isMissing() {
    return isNotFoundError(this.company.error());
  }

  constructor() {
    effect(() => {
      const data = this.company.value();
      if (data && this.auth.isAuthenticated()) {
        void firstValueFrom(
          this.http.get<{ following: boolean }>(`${environment.apiUrl}/companies/${data.id}/following`),
        ).then((row) => this.following.set(row.following));
      }
    });
  }

  async toggleFollow(id: string) {
    if (this.followBusy()) {
      return;
    }
    this.followBusy.set(true);
    try {
      if (this.following()) {
        await firstValueFrom(this.http.delete(`${environment.apiUrl}/companies/${id}/follow`));
        this.following.set(false);
        this.toast.show('Unfollowed', 'success');
      } else {
        await firstValueFrom(this.http.post(`${environment.apiUrl}/companies/${id}/follow`, {}));
        this.following.set(true);
        this.toast.show('Following company', 'success');
      }
      this.company.reload();
    } catch {
      this.toast.show('Could not update follow', 'error');
    } finally {
      this.followBusy.set(false);
    }
  }

  async message(userId: string) {
    const conversation = await firstValueFrom(
      this.http.post<{ id: string }>(`${environment.apiUrl}/conversations`, { userId }),
    );
    await this.router.navigate(['/messages', conversation.id]);
  }
}
