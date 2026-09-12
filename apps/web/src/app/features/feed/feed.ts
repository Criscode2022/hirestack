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
          <strong>{{ applications.isLoading() ? '…' : offerCount() }}</strong>
          <span>Offers</span>
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
      @if (offerCount() > 0) {
        <section class="card review-call offer-call">
          <h2>{{ offerCount() === 1 ? '1 offer to answer' : offerCount() + ' offers to answer' }}</h2>
          <p class="muted">Accept or decline from Applications. You do not have to hunt the board.</p>
          <a class="button" routerLink="/applications">Answer the offer</a>
        </section>
      }
      <section class="card desk-next">
        <h2>Your next moves</h2>
        <ul class="check-list">
          <li [class.done]="looking()">Open to work is {{ looking() ? 'on' : 'off' }}</li>
          <li [class.done]="hasResume()">Current resume on file</li>
          <li [class.done]="inPlay() > 0">{{ inPlay() || 0 }} applications in play</li>
        </ul>
        <div class="cta-row">
          <a routerLink="/jobs" class="button">Find a role</a>
          <a routerLink="/applications" class="ghost">Applications</a>
          <a routerLink="/profile" class="ghost">Edit profile</a>
        </div>
      </section>
    }

    @if (auth.hasRole('EMPLOYER')) {
      <div class="stats">
        <article>
          <strong>{{ dash.isLoading() ? '…' : (dash.value()?.openJobs ?? 0) }}</strong>
          <span>Open jobs</span>
        </article>
        <article>
          <strong>{{ dash.isLoading() ? '…' : submittedCount() }}</strong>
          <span>Submitted</span>
        </article>
        <article>
          <strong>{{ dash.isLoading() ? '…' : hiredCount() }}</strong>
          <span>Hired</span>
        </article>
        <article>
          <strong>{{ platform.workspacePlan()?.planName ?? '…' }}</strong>
          <span>Workspace plan</span>
        </article>
      </div>
      <section class="card desk-next">
        <h2>Hiring next moves</h2>
        <ul class="check-list">
          <li [class.done]="!!auth.user()?.company">Company page live</li>
          <li [class.done]="!jobs.isLoading() && (jobs.value()?.length ?? 0) > 0">
            @if (jobs.isLoading()) { Checking roles on the desk… }
            @else { At least one role on the desk }
          </li>
          <li [class.done]="!dash.isLoading() && submittedCount() > 0">
            @if (dash.isLoading()) { Checking submitted… }
            @else { {{ submittedCount() }} waiting in submitted }
          </li>
        </ul>
        <div class="cta-row">
          <a routerLink="/employer" class="button">Open hiring desk</a>
          <a routerLink="/employer/billing" class="ghost">Billing</a>
        </div>
      </section>
      @if (offerCount() > 0) {
        <section class="card review-call offer-call">
          <h2>{{ offerCount() === 1 ? '1 offer waiting on a candidate' : offerCount() + ' offers waiting on candidates' }}</h2>
          <p class="muted">They accept or decline from their desk. Open the pipeline to message or rescind.</p>
          <a class="button" routerLink="/employer">Open hiring desk</a>
        </section>
      }
    }

    <div class="feed-layout">
      <aside class="stack rail">
        @if (auth.user(); as me) {
          <article>
            <span class="avatar lg">{{ initials(me.name) }}</span>
            <p class="eyebrow">Your profile</p>
            <a [routerLink]="['/people', me.id]"><strong>{{ me.name }}</strong></a>
            <p class="muted">{{ me.headline }}</p>
            @if (auth.hasRole('CANDIDATE') && looking()) { <span class="chip open">Open to work</span> }
            @if (auth.hasRole('CANDIDATE')) {
              <p><a routerLink="/profile">Edit profile</a></p>
            } @else if (auth.hasRole('EMPLOYER')) {
              <p><a routerLink="/employer/company">Company settings</a></p>
            } @else if (auth.hasRole('ADMIN')) {
              <p><a routerLink="/admin">Moderation</a></p>
            }
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
            <div class="section-head">
              <h2>For you</h2>
              <a routerLink="/jobs">See more<span class="sr-only"> matches</span></a>
            </div>
            @if (recommended.isLoading()) {
              <hs-skeleton [rows]="[1,2]" [height]="72" />
            } @else if (recommended.error()) {
              <hs-empty-state title="Could not load matches" message="Recommended roles return when the board is reachable." />
            } @else if (recommended.hasValue() && recommended.value()!.length) {
              <div class="stack reco-list">
                @for (job of recommended.value()!.slice(0, 4); track job.id) {
                  <hs-job-card [job]="job" />
                }
              </div>
            } @else {
              <hs-empty-state title="No matches yet" message="Add skills on your profile to see closer roles.">
                <a routerLink="/profile" class="ghost">Edit profile</a>
              </hs-empty-state>
            }
          </section>
        } @else if (auth.hasRole('EMPLOYER')) {
          <section>
            <h2>Hiring desk</h2>
            <p class="muted">Review submitted people, feature a role, or check published inventory.</p>
            <p><a routerLink="/employer">Pipeline overview</a></p>
            <p><a routerLink="/employer/jobs/new">Post a job</a></p>
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
            <ul class="activity-list">
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
  readonly platform = inject(PlatformService);
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
  readonly resumes = httpResource<Array<{ id: string }>>(() =>
    this.auth.hasRole('CANDIDATE') ? `${environment.apiUrl}/me/resumes` : undefined,
  );
  readonly dash = httpResource<{
    openJobs: number;
    hired?: number;
    pipeline: Record<string, number>;
  }>(() => (this.auth.hasRole('EMPLOYER') ? `${environment.apiUrl}/me/employer-dashboard` : undefined));
  readonly jobs = httpResource<Array<{ id: string }>>(() =>
    this.auth.hasRole('EMPLOYER') ? `${environment.apiUrl}/me/jobs` : undefined,
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

  offerCount() {
    if (this.auth.hasRole('CANDIDATE')) {
      return (this.applications.value() ?? []).filter((row) => row.status === 'OFFER').length;
    }
    return this.dash.value()?.pipeline?.['OFFER'] ?? 0;
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

  hasResume() {
    return (this.resumes.value()?.length ?? 0) > 0;
  }

  submittedCount() {
    return this.dash.value()?.pipeline?.['SUBMITTED'] ?? 0;
  }

  hiredCount() {
    const dash = this.dash.value();
    return dash?.pipeline?.['HIRED'] ?? dash?.hired ?? 0;
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
