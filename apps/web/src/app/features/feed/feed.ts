import { Component, inject, signal } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthStore } from '../../core/auth.store';
import { PlatformService } from '../../core/platform.service';
import { ToastService } from '../../core/toast.service';
import { EmptyState, JobCard, Skeleton } from '../../shared/ui';
import { initials, timeAgo } from '../../shared/time';
import type { FeedPost, MarketTapeItem, PublicJobCard, PublicPersonCard } from '@hirestack/shared';

@Component({
  selector: 'hs-feed',
  imports: [RouterLink, EmptyState, Skeleton, JobCard],
  template: `
    <header class="page-head">
      <div>
        <p class="eyebrow">Home</p>
        <h1>What’s happening</h1>
        <p class="lede">Short updates from people and hiring teams. No noise, no feed tricks.</p>
      </div>
    </header>
    @if (auth.hasRole('CANDIDATE')) {
      <div class="stats">
        <article>
          <strong>{{ applications.isLoading() ? '…' : inPlay() }}</strong>
          <span>In play</span>
        </article>
        <article>
          <strong>{{ savedCount() }}</strong>
          <span>Saved</span>
        </article>
        <article>
          <strong>{{ looking() ? 'On' : 'Off' }}</strong>
          <span>Open to work</span>
        </article>
      </div>
    }

    <div class="feed-layout">
      <aside class="stack rail">
        @if (auth.user(); as me) {
          <article>
            <span class="avatar lg">{{ initials(me.name) }}</span>
            <p class="eyebrow">Your profile</p>
            <a [routerLink]="['/people', me.id]"><strong>{{ me.name }}</strong></a>
            <p class="muted">{{ me.headline }}</p>
            @if (looking()) { <span class="chip open">Open to work</span> }
            <p><a routerLink="/profile">Edit profile</a></p>
            <p><a routerLink="/live">Live board</a></p>
          </article>
        } @else {
          <article>
            <p class="eyebrow">Welcome</p>
            <p>Join to post, save jobs, and message hiring leads.</p>
            <a class="button" routerLink="/register">Create a free profile</a>
          </article>
        }
      </aside>
      <div class="stack feed-stream">
        @if (auth.isAuthenticated()) {
          <form class="composer" (submit)="publish($event)">
            <div class="chips">
              <button type="button" class="chip quick" [class.active]="kind() === 'UPDATE'" (click)="kind.set('UPDATE')">Update</button>
              <button type="button" class="chip quick" [class.active]="kind() === 'HIRING'" (click)="kind.set('HIRING')">Hiring</button>
              <button type="button" class="chip quick" [class.active]="kind() === 'JOB_SHARE'" (click)="kind.set('JOB_SHARE')">Looking</button>
            </div>
            <label>
              Share something useful
              <textarea rows="3" [value]="draft()" (input)="draft.set($any($event.target).value)" placeholder="A role you opened, a project you shipped, or what you want next."></textarea>
            </label>
            <button type="submit">Post</button>
          </form>
        }

        @if (loading()) {
          <hs-skeleton />
        } @else if (loadError()) {
          <hs-empty-state title="Could not load the feed" message="Sign in again, then retry." />
        } @else if (!posts().length) {
          <hs-empty-state title="Quiet for now" message="Be the first to share a hiring note or an open-to-work update." />
        } @else {
          @for (post of posts(); track post.id) {
            <article class="post">
              <header class="person-row">
                <span class="avatar">{{ initials(post.author.name) }}</span>
                <div>
                  <a [routerLink]="['/people', post.author.id]"><strong>{{ post.author.name }}</strong></a>
                  <p class="muted">{{ post.author.headline }} · {{ timeAgo(post.createdAt) }}</p>
                </div>
                <span class="chip">{{ label(post.kind) }}</span>
              </header>
              <p>{{ post.body }}</p>
              @if (post.company) {
                <p class="meta">via <a [routerLink]="['/companies', post.company.slug]">{{ post.company.name }}</a></p>
              }
              <div class="actions">
                @if (auth.isAuthenticated()) {
                  <button type="button" class="ghost" (click)="toggleLike(post)">{{ post.likedByMe ? 'Liked' : 'Like' }} · {{ post.likeCount }}</button>
                } @else {
                  <span class="muted">{{ post.likeCount }} likes · {{ post.commentCount }} comments</span>
                }
              </div>
              @if (post.comments.length) {
                <div class="comments">
                  @for (comment of post.comments; track comment.id) {
                    <p><a [routerLink]="['/people', comment.author.id]"><strong>{{ comment.author.name }}</strong></a> {{ comment.body }}</p>
                  }
                </div>
              }
              @if (auth.isAuthenticated()) {
                <form class="reply" (submit)="comment($event, post.id)">
                  <input name="comment" placeholder="Write a short reply" />
                  <button type="submit" class="ghost">Reply</button>
                </form>
              }
            </article>
          }
        }
      </div>

      <aside class="stack rail">
        @if (auth.hasRole('CANDIDATE')) {
          <section>
            <h2>For you</h2>
            @if (recommended.isLoading()) {
              <hs-skeleton [rows]="[1,2]" [height]="72" />
            } @else if (recommended.hasValue() && recommended.value()!.length) {
              <div class="stack">
                @for (job of recommended.value()!; track job.id) {
                  <hs-job-card [job]="job" />
                }
              </div>
            } @else {
              <hs-empty-state title="No matches yet" message="Add skills on your profile to see closer roles.">
                <a routerLink="/profile" class="ghost">Edit profile</a>
              </hs-empty-state>
            }
          </section>
        } @else {
          <section>
            <h2>Start here</h2>
            <p class="muted">Follow a company, connect with one person, or post what you are hiring.</p>
            <a routerLink="/people">Browse people</a>
          </section>
        }
        @if (tape.hasValue() && tape.value()!.length) {
          <section>
            <h2>Just now</h2>
            <ul class="tape-list">
              @for (item of tape.value()!.slice(0, 6); track item.id) {
                <li>
                  <a [routerLink]="item.href">{{ item.label }}</a>
                </li>
              }
            </ul>
          </section>
        }
      </aside>
    </div>
  `,
})
export class FeedPage {
  private readonly http = inject(HttpClient);
  private readonly platform = inject(PlatformService);
  readonly auth = inject(AuthStore);
  private readonly toast = inject(ToastService);
  readonly posts = signal<FeedPost[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly draft = signal('');
  readonly kind = signal<'UPDATE' | 'HIRING' | 'JOB_SHARE'>('UPDATE');
  readonly initials = initials;
  readonly timeAgo = timeAgo;
  readonly recommended = httpResource<PublicJobCard[]>(() =>
    this.auth.hasRole('CANDIDATE') ? `${environment.apiUrl}/jobs/recommended` : undefined,
  );
  readonly applications = httpResource<Array<{ status: string }>>(() =>
    this.auth.hasRole('CANDIDATE') ? `${environment.apiUrl}/me/applications` : undefined,
  );
  readonly peers = httpResource<PublicPersonCard[]>(() => {
    if (!this.auth.hasRole('CANDIDATE') || this.auth.user()?.openToWork) {
      return undefined;
    }
    return `${environment.apiUrl}/people`;
  });
  readonly tape = httpResource<MarketTapeItem[]>(() => `${environment.apiUrl}/market/tape`);

  constructor() {
    void this.load();
  }

  inPlay() {
    const closed = new Set(['REJECTED', 'WITHDRAWN']);
    return (this.applications.value() ?? []).filter((row) => !closed.has(row.status)).length;
  }

  savedCount() {
    return this.platform.savedJobIds().size;
  }

  looking() {
    if (this.auth.user()?.openToWork) {
      return true;
    }
    const id = this.auth.user()?.id;
    return Boolean((this.peers.value() ?? []).find((row) => row.id === id)?.openToWork);
  }

  label(kind: string) {
    if (kind === 'HIRING') return 'Hiring';
    if (kind === 'JOB_SHARE') return 'Looking';
    return 'Update';
  }

  private async load() {
    this.loading.set(true);
    try {
      this.posts.set(await this.platform.getFeed());
      this.loadError.set(false);
    } catch {
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  async publish(event: Event) {
    event.preventDefault();
    if (!this.draft().trim()) return;
    await firstValueFrom(this.http.post(`${environment.apiUrl}/feed`, { body: this.draft(), kind: this.kind() }));
    this.draft.set('');
    this.toast.show('Posted', 'success');
    this.posts.set(await this.platform.getFeed(true));
  }

  async toggleLike(post: FeedPost) {
    if (post.likedByMe) {
      await firstValueFrom(this.http.delete(`${environment.apiUrl}/feed/${post.id}/like`));
    } else {
      await firstValueFrom(this.http.post(`${environment.apiUrl}/feed/${post.id}/like`, {}));
    }
    this.posts.set(await this.platform.getFeed(true));
  }

  async comment(event: Event, postId: string) {
    event.preventDefault();
    const input = (event.target as HTMLFormElement).elements.namedItem('comment') as HTMLInputElement;
    if (!input.value.trim()) return;
    await firstValueFrom(this.http.post(`${environment.apiUrl}/feed/${postId}/comments`, { body: input.value }));
    input.value = '';
    this.posts.set(await this.platform.getFeed(true));
  }
}
