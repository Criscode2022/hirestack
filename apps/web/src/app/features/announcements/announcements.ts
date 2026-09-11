import { Component, DestroyRef, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthStore } from '../../core/auth.store';
import { ToastService } from '../../core/toast.service';
import { EmptyState, Skeleton } from '../../shared/ui';
import { initials, timeAgo } from '../../shared/time';
import type { AnnouncementCard } from '@hirestack/shared';

@Component({
  selector: 'hs-announcements',
  imports: [RouterLink, EmptyState, Skeleton],
  template: `
    <header class="page-head">
      <div>
        <p class="eyebrow live-kicker"><span class="pulse" aria-hidden="true"></span> Live board</p>
        <h1>Announcements</h1>
        <p class="lede">Short hiring notes. Apply in one tap. Message the person who posted it.</p>
      </div>
      <p class="live-meta">{{ openCount() }} open · updates every few seconds</p>
    </header>

    <div class="live-layout">
      <div class="live-main stack">
        @if (auth.hasRole('EMPLOYER')) {
          <form class="composer board-composer" (submit)="publish($event)">
            <p class="eyebrow">Post now</p>
            <label>
              Title
              <input [value]="draftTitle()" (input)="draftTitle.set($any($event.target).value)" maxlength="80" placeholder="Need an Angular lead this week" />
            </label>
            <label>
              The ask
              <textarea rows="3" [value]="draftBody()" (input)="draftBody.set($any($event.target).value)" maxlength="400" placeholder="What you need, when, and how fast you will reply."></textarea>
            </label>
            <div class="cta-row">
              <label class="inline">
                Place
                <input [value]="draftLocation()" (input)="draftLocation.set($any($event.target).value)" placeholder="Remote or city" />
              </label>
              <button type="submit" [disabled]="posting()">Put it on the board</button>
            </div>
          </form>
        }

        @if (board.isLoading() && !board.hasValue()) {
          <hs-skeleton [rows]="[1,2,3]" />
        } @else if (board.error()) {
          <hs-empty-state title="Board is offline" message="Could not load announcements. Retry in a moment." />
        } @else if (!board.hasValue() || !board.value()!.length) {
          <hs-empty-state title="Board is quiet" message="Employers can post a short announcement. Candidates apply from here." />
        } @else {
          <div class="board-stream">
            @for (item of board.value()!; track item.id) {
              <article
                class="announce"
                [id]="announcementAnchor(item.id)"
                [class.fresh]="isFresh(item.createdAt)"
                [class.mine]="item.author.id === auth.user()?.id"
              >
                <header class="announce-top">
                  <span class="avatar">{{ initials(item.author.name) }}</span>
                  <div>
                    <a [routerLink]="['/people', item.author.id]"><strong>{{ item.author.name }}</strong></a>
                    <p class="muted">
                      {{ item.author.company?.name ?? item.author.headline }}
                      · {{ timeAgo(item.createdAt) }}
                    </p>
                  </div>
                  <div class="applicant-count" [attr.data-count]="item.applicantCount">
                    <strong>{{ item.applicantCount }}</strong>
                    <span>{{ item.applicantCount === 1 ? 'applicant' : 'applicants' }}</span>
                  </div>
                </header>
                <h2>{{ item.title }}</h2>
                <p>{{ item.body }}</p>
                <p class="meta">
                  @if (item.workplace) { {{ item.workplace.toLowerCase() }} }
                  @if (item.location) { · {{ item.location }} }
                  @if (isFresh(item.createdAt)) { · <span class="fresh-tag">just in</span> }
                </p>
                <div class="actions">
                  @if (auth.hasRole('CANDIDATE')) {
                    <button type="button" [disabled]="busyId() === item.id || item.appliedByMe" (click)="apply(item)">
                      {{ item.appliedByMe ? 'Applied' : 'Apply now' }}
                    </button>
                    <button type="button" class="ghost" [disabled]="busyId() === item.id" (click)="contact(item)">Contact</button>
                  } @else if (!auth.isAuthenticated()) {
                    <a class="button" [routerLink]="['/login']" [queryParams]="{ next: '/live' }">Sign in to apply</a>
                  }
                  @if (item.author.id === auth.user()?.id) {
                    <button type="button" class="ghost" (click)="close(item.id)">Close</button>
                  }
                </div>
              </article>
            }
          </div>
        }
      </div>

      <aside class="live-rail rail" aria-label="Recent announcements">
        <section class="live-sidebar-panel">
          <header class="section-head">
            <div>
              <p class="eyebrow live-kicker"><span class="pulse" aria-hidden="true"></span> Live feed</p>
              <h2>Just in</h2>
            </div>
            <span class="live-meta">{{ openCount() }} open</span>
          </header>

          @if (board.isLoading() && !board.hasValue()) {
            <hs-skeleton [rows]="[1,2,3,4]" [height]="64" />
          } @else if (!board.hasValue() || !board.value()!.length) {
            <p class="muted">New posts land here first.</p>
          } @else {
            <ul class="live-sidebar">
              @for (item of board.value()!; track item.id) {
                <li [class.fresh]="isFresh(item.createdAt)" [class.mine]="item.author.id === auth.user()?.id">
                  <a class="live-sidebar-link" [href]="'#' + announcementAnchor(item.id)">
                    <span class="live-sidebar-title">{{ item.title }}</span>
                    <span class="live-sidebar-meta">
                      {{ item.author.name }}
                      · {{ timeAgo(item.createdAt) }}
                      @if (isFresh(item.createdAt)) { · <span class="fresh-tag">new</span> }
                    </span>
                  </a>
                  <div class="live-sidebar-row">
                    <span class="live-sidebar-foot">
                      {{ item.applicantCount }} {{ item.applicantCount === 1 ? 'applicant' : 'applicants' }}
                      @if (item.workplace) { · {{ item.workplace.toLowerCase() }} }
                    </span>
                    @if (auth.hasRole('CANDIDATE') && item.author.id !== auth.user()?.id) {
                      <button
                        type="button"
                        class="live-apply"
                        [disabled]="busyId() === item.id || item.appliedByMe"
                        (click)="apply(item)"
                      >
                        {{ item.appliedByMe ? 'Applied' : busyId() === item.id ? 'Applying…' : 'Apply' }}
                      </button>
                    } @else if (!auth.isAuthenticated()) {
                      <a class="button live-apply" [routerLink]="['/login']" [queryParams]="{ next: '/live' }">Apply</a>
                    }
                  </div>
                </li>
              }
            </ul>
          }
        </section>
      </aside>
    </div>
  `,
})
export class AnnouncementsPage {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroy = inject(DestroyRef);
  readonly auth = inject(AuthStore);
  readonly initials = initials;
  readonly timeAgo = timeAgo;
  readonly now = signal(Date.now());
  readonly busyId = signal<string | null>(null);
  readonly posting = signal(false);
  readonly draftTitle = signal('');
  readonly draftBody = signal('');
  readonly draftLocation = signal('');
  readonly board = httpResource<AnnouncementCard[]>(() => `${environment.apiUrl}/announcements`);
  readonly openCount = computed(() => (this.board.hasValue() ? this.board.value()!.length : 0));

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const tick = setInterval(() => this.now.set(Date.now()), 15_000);
      const poll = setInterval(() => this.board.reload(), 7000);
      this.destroy.onDestroy(() => {
        clearInterval(tick);
        clearInterval(poll);
      });
    }
  }

  isFresh(createdAt: string) {
    return this.now() - new Date(createdAt).getTime() < 45 * 60_000;
  }

  announcementAnchor(id: string) {
    return `ann-${id}`;
  }

  async publish(event: Event) {
    event.preventDefault();
    if (!this.draftTitle().trim() || !this.draftBody().trim()) return;
    this.posting.set(true);
    try {
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/announcements`, {
          title: this.draftTitle(),
          body: this.draftBody(),
          location: this.draftLocation() || undefined,
          workplace: this.draftLocation().toLowerCase().includes('remote') ? 'REMOTE' : undefined,
        }),
      );
      this.draftTitle.set('');
      this.draftBody.set('');
      this.draftLocation.set('');
      this.toast.show('On the board', 'success');
      this.board.reload();
    } catch {
      this.toast.show('Could not post announcement', 'error');
    } finally {
      this.posting.set(false);
    }
  }

  async apply(item: AnnouncementCard) {
    this.busyId.set(item.id);
    try {
      await firstValueFrom(this.http.post(`${environment.apiUrl}/announcements/${item.id}/apply`, {}));
      this.toast.show('Applied. The announcer was notified.', 'success');
      this.board.reload();
    } catch (error: unknown) {
      const text = JSON.stringify(error);
      if (text.includes('already applied')) {
        this.toast.show('You already applied', 'error');
        this.board.reload();
      } else if (text.includes('resume')) {
        this.toast.show('Add a current resume on your profile first', 'error');
        await this.router.navigateByUrl('/profile');
      } else {
        this.toast.show('Could not apply', 'error');
      }
    } finally {
      this.busyId.set(null);
    }
  }

  async contact(item: AnnouncementCard) {
    this.busyId.set(item.id);
    try {
      const conversation = await firstValueFrom(
        this.http.post<{ id: string }>(`${environment.apiUrl}/conversations`, { userId: item.author.id }),
      );
      await this.router.navigate(['/messages', conversation.id]);
    } catch {
      this.toast.show('Could not open a conversation', 'error');
    } finally {
      this.busyId.set(null);
    }
  }

  async close(id: string) {
    await firstValueFrom(this.http.post(`${environment.apiUrl}/announcements/${id}/close`, {}));
    this.toast.show('Announcement closed', 'success');
    this.board.reload();
  }
}
