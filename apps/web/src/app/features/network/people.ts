import { Component, computed, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EmptyState, PersonCard, Skeleton } from '../../shared/ui';
import { AuthStore } from '../../core/auth.store';
import { PlatformService } from '../../core/platform.service';
import { ToastService } from '../../core/toast.service';
import { initials } from '../../shared/time';
import type { ConnectionRequest, ConnectionRow, PublicPersonCard } from '@hirestack/shared';

type NetworkTab = 'discover' | 'requests' | 'connections' | 'suggested';

@Component({
  selector: 'hs-people',
  imports: [RouterLink, EmptyState, Skeleton, PersonCard],
  template: `
    <header class="page-head">
      <div>
        <p class="eyebrow">Network</p>
        <h1>People</h1>
        <p class="lede">Browse real profiles. Connect when it is useful — not as a default.</p>
      </div>
      <input type="search" placeholder="Search names, headlines, cities, skills" (input)="query.set($any($event.target).value)" />
    </header>

    @if (skillChips().length) {
      <div class="chips">
        @for (skill of skillChips(); track skill) {
          <button type="button" class="chip quick" [class.active]="query() === skill" (click)="query.set(query() === skill ? '' : skill)">{{ skill }}</button>
        }
      </div>
    }

    @if (auth.isAuthenticated()) {
      <div class="tabs" role="tablist">
        <button type="button" class="ghost" [class.active]="tab() === 'discover'" (click)="tab.set('discover')">Discover</button>
        <button type="button" class="ghost" [class.active]="tab() === 'requests'" (click)="tab.set('requests')">
          Requests @if (requests().length) { <span class="count">{{ requests().length }}</span> }
        </button>
        <button type="button" class="ghost" [class.active]="tab() === 'connections'" (click)="tab.set('connections')">My network</button>
        <button type="button" class="ghost" [class.active]="tab() === 'suggested'" (click)="tab.set('suggested')">Suggested</button>
      </div>
    }

    @if (loading()) {
      <hs-skeleton />
    } @else if (tab() === 'requests') {
      @if (!requests().length) {
        <hs-empty-state title="No pending requests" message="When someone wants to connect, it lands here." />
      } @else {
        <div class="stack">
          @for (row of requests(); track row.id) {
            <article class="person-row list-row">
              <span class="avatar">{{ initials(row.requester.name) }}</span>
              <div>
                <a [routerLink]="['/people', row.requester.id]"><strong>{{ row.requester.name }}</strong></a>
                <p class="muted">{{ row.requester.headline }}</p>
              </div>
              <div class="actions">
                <button type="button" (click)="respond(row.id, 'ACCEPTED')">Accept</button>
                <button type="button" class="ghost" (click)="respond(row.id, 'DECLINED')">Ignore</button>
              </div>
            </article>
          }
        </div>
      }
    } @else if (tab() === 'connections') {
      @if (!connections().length) {
        <hs-empty-state title="No connections yet" message="Accept a request or send one from a card." />
      } @else {
        <div class="grid">
          @for (row of connections(); track row.id) {
            <article class="person-card">
              <span class="avatar">{{ initials(row.other.name) }}</span>
              <a [routerLink]="['/people', row.other.id]" class="title">{{ row.other.name }}</a>
              <p class="muted">{{ row.other.headline }}</p>
              <p class="meta">{{ row.other.location }}</p>
            </article>
          }
        </div>
      }
    } @else if (tab() === 'suggested') {
      @if (!suggested().length) {
        <hs-empty-state title="No suggestions yet" message="Add skills on your profile so we can match overlapping people." />
      } @else {
        <div class="grid">
          @for (person of suggested(); track person.id) {
            <hs-person-card
              [person]="person"
              [showConnect]="true"
              [sent]="platform.sentConnectIds().has(person.id)"
              (connect)="connect(person.id)"
            />
          }
        </div>
      }
    } @else if (!filtered().length) {
      <hs-empty-state title="No people match" message="Try a skill, city, or first name." />
    } @else {
      <div class="grid">
        @for (person of filtered(); track person.id) {
          <hs-person-card
            [person]="person"
            [showConnect]="true"
            [sent]="platform.sentConnectIds().has(person.id)"
            (connect)="connect(person.id)"
          />
        }
      </div>
    }
  `,
})
export class PeoplePage {
  readonly platform = inject(PlatformService);
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthStore);
  readonly people = signal<PublicPersonCard[]>([]);
  readonly requests = signal<ConnectionRequest[]>([]);
  readonly connections = signal<ConnectionRow[]>([]);
  readonly suggested = signal<PublicPersonCard[]>([]);
  readonly loading = signal(true);
  readonly query = signal('');
  readonly tab = signal<NetworkTab>('discover');
  readonly initials = initials;
  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const rows = this.people();
    if (!q) return rows;
    return rows.filter(
      (person) =>
        person.name.toLowerCase().includes(q) ||
        (person.headline ?? '').toLowerCase().includes(q) ||
        (person.location ?? '').toLowerCase().includes(q) ||
        person.skills.some((skill) => skill.name.toLowerCase().includes(q)),
    );
  });
  readonly skillChips = computed(() => {
    const counts = new Map<string, number>();
    for (const person of this.people()) {
      for (const skill of person.skills) {
        counts.set(skill.name, (counts.get(skill.name) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name]) => name);
  });

  constructor() {
    void this.load();
    effect(() => {
      if (this.auth.ready() && this.auth.isAuthenticated()) {
        void this.loadNetwork();
      }
    });
  }

  connect(userId: string) {
    void this.platform.connect(userId);
  }

  private async load() {
    this.loading.set(true);
    this.people.set(await this.platform.getPeople());
    if (this.auth.isAuthenticated()) {
      await this.loadNetwork();
    }
    this.loading.set(false);
  }

  private async loadNetwork() {
    const [requests, connections, suggested] = await Promise.all([
      this.platform.getRequests(),
      this.platform.getConnections(),
      this.platform.getSuggested(),
    ]);
    this.requests.set(requests);
    this.connections.set(connections);
    this.suggested.set(suggested);
    this.platform.pendingRequests.set(requests.length);
  }

  async respond(id: string, status: 'ACCEPTED' | 'DECLINED') {
    await firstValueFrom(this.http.post(`${environment.apiUrl}/connections/${id}/respond`, { status }));
    this.toast.show(status === 'ACCEPTED' ? 'You are connected' : 'Request ignored', 'success');
    await this.load();
  }
}
