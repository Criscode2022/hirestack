import { Component, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthStore } from '../../core/auth.store';
import { ToastService } from '../../core/toast.service';
import { EmptyState, Skeleton } from '../../shared/ui';
import { initials } from '../../shared/time';
import { titleLabel, type PublicProfile } from '@hirestack/shared';

@Component({
  selector: 'hs-person',
  imports: [EmptyState, Skeleton, RouterLink],
  template: `
    @if (profile.isLoading()) {
      <hs-skeleton />
    } @else if (!profile.value()) {
      <hs-empty-state title="Profile not found" message="This person may have left HireStack, or the link is stale." />
    } @else {
      @let data = profile.value()!;
      <header class="profile-hero">
        <span class="avatar lg">{{ initials(data.name) }}</span>
        <div>
          <div class="chips">
            <span class="chip">{{ titleLabel(data.role) }}</span>
            @if (data.openToWork) { <span class="chip open">Open to work</span> }
          </div>
          <h1>{{ data.name }}</h1>
          <p class="lede">{{ data.headline }}</p>
          <p class="muted">{{ data.location }} · {{ data.connectionCount }} connections @if (data.company) { · <a [routerLink]="['/companies', data.company.slug]">{{ data.company.name }}</a> }</p>
          <p class="eyebrow">Profile {{ data.completeness }}% complete</p>
          <div class="meter" aria-hidden="true"><i [style.width.%]="data.completeness"></i></div>
        </div>
        <div class="actions">
          @if (auth.isAuthenticated() && data.connectionStatus !== 'SELF') {
            @if (data.connectionStatus === 'NONE') {
              <button type="button" (click)="connect(data.id)">Connect</button>
            }
            @if (data.connectionStatus === 'PENDING_OUT') {
              <button type="button" class="ghost" disabled>Request sent</button>
            }
            @if (data.connectionStatus === 'PENDING_IN' && data.connectionId) {
              <button type="button" (click)="respond(data.connectionId, 'ACCEPTED')">Accept</button>
              <button type="button" class="ghost" (click)="respond(data.connectionId, 'DECLINED')">Ignore</button>
            }
            @if (data.connectionStatus === 'CONNECTED') {
              <span class="chip">Connected</span>
            }
            <button type="button" class="ghost" (click)="message(data.id)">Message</button>
          }
          @if (data.connectionStatus === 'SELF') {
            <a class="button" routerLink="/profile">Edit profile</a>
          }
        </div>
      </header>
      @if (data.bio) {
        <p class="profile-bio">{{ data.bio }}</p>
      }
      @if (data.portfolioUrl) {
        <p><a [href]="data.portfolioUrl" rel="noreferrer" target="_blank">Portfolio</a></p>
      }
      <section>
        <h2>Experience</h2>
        @if (!data.experiences.length) {
          <p class="muted">No roles listed yet.</p>
        }
        @for (item of data.experiences; track item.id) {
          <article class="list-row">
            <strong>{{ item.title }}</strong>
            <p class="muted">{{ item.companyName }} @if (item.location) { · {{ item.location }} }</p>
            <p class="meta">{{ item.startDate.slice(0, 7) }} – {{ item.isCurrent ? 'Present' : (item.endDate?.slice(0, 7) ?? '') }}</p>
            @if (item.description) { <p>{{ item.description }}</p> }
          </article>
        }
      </section>
      <section>
        <h2>Education</h2>
        @if (!data.education.length) {
          <p class="muted">No schools listed yet.</p>
        }
        @for (item of data.education; track item.id) {
          <article class="list-row">
            <strong>{{ item.school }}</strong>
            <p class="muted">{{ item.degree }} {{ item.field }}</p>
            <p class="meta">{{ item.startYear }} – {{ item.endYear }}</p>
          </article>
        }
      </section>
      @if (data.projects.length) {
        <section>
          <h2>Featured work</h2>
          @for (item of data.projects; track item.id) {
            <article class="list-row">
              <strong>{{ item.title }}</strong>
              @if (item.url) { <p><a [href]="item.url" rel="noreferrer" target="_blank">Open</a></p> }
              <p class="muted">{{ item.description }}</p>
            </article>
          }
        </section>
      }
      <section>
        <h2>Recommendations</h2>
        @if (!data.recommendations.length) {
          <p class="muted">No recommendations yet.</p>
        }
        @for (item of data.recommendations; track item.id) {
          <article class="list-row">
            <p class="eyebrow">{{ item.relationship }}</p>
            <p>{{ item.body }}</p>
            <p class="muted">— <a [routerLink]="['/people', item.author.id]">{{ item.author.name }}</a></p>
          </article>
        }
        @if (auth.isAuthenticated() && data.connectionStatus === 'CONNECTED') {
          <form (submit)="recommend($event, data.id)">
            <label>How you know them <input name="relationship" required /></label>
            <label>Note <textarea name="body" rows="3" required></textarea></label>
            <button type="submit" class="ghost">Write a recommendation</button>
          </form>
        }
      </section>
      <div class="chips">
        @for (skill of data.skills; track skill.slug) {
          <span class="chip">{{ skill.name }}</span>
        }
      </div>
    }
  `,
})
export class PersonPage {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  readonly auth = inject(AuthStore);
  private readonly toast = inject(ToastService);
  readonly initials = initials;
  readonly titleLabel = titleLabel;
  readonly profile = httpResource<PublicProfile>(() => {
    const id = this.route.snapshot.paramMap.get('id');
    return id ? `${environment.apiUrl}/people/${id}` : undefined;
  });

  async connect(userId: string) {
    await firstValueFrom(this.http.post(`${environment.apiUrl}/connections`, { userId }));
    this.toast.show('Connection request sent', 'success');
    this.profile.reload();
  }

  async respond(connectionId: string, status: 'ACCEPTED' | 'DECLINED') {
    await firstValueFrom(this.http.post(`${environment.apiUrl}/connections/${connectionId}/respond`, { status }));
    this.toast.show(status === 'ACCEPTED' ? 'You are connected' : 'Request ignored', 'success');
    this.profile.reload();
  }

  async recommend(event: Event, userId: string) {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const data = new FormData(form);
    await firstValueFrom(
      this.http.post(`${environment.apiUrl}/people/${userId}/recommendations`, {
        relationship: String(data.get('relationship')),
        body: String(data.get('body')),
      }),
    );
    form.reset();
    this.toast.show('Recommendation posted', 'success');
    this.profile.reload();
  }

  async message(userId: string) {
    const conversation = await firstValueFrom(
      this.http.post<{ id: string }>(`${environment.apiUrl}/conversations`, { userId }),
    );
    await this.router.navigate(['/messages', conversation.id]);
  }
}
