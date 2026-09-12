import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import { httpResource } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthStore } from '../../core/auth.store';
import { ToastService } from '../../core/toast.service';
import { FieldError } from '../../shared/ui';
import { initials } from '../../shared/time';
import { resourceRows } from '../../shared/resource';
import { uploadCandidateResume, resumeUploadErrorMessage, uploadsArePaused } from '../../shared/resume-upload';

interface Resume {
  id: string;
  fileName: string;
  isCurrent: boolean;
}

interface Skill {
  slug: string;
  name: string;
}

interface MePayload {
  userSkills?: Array<{ skill: Skill }>;
}

@Component({
  selector: 'hs-profile',
  imports: [FormField, FieldError, RouterLink],
  template: `
    <header class="page-head">
      <div>
        <p class="eyebrow">Your desk</p>
        <h1>Profile</h1>
        <p class="lede">This is what employers see first. Keep it short and current.</p>
      </div>
      @if (auth.user()?.id) {
        <a class="ghost" [routerLink]="['/people', auth.user()!.id]">View public page</a>
      }
    </header>

    <form class="card desk-about" (submit)="save($event)">
      <div class="profile-hero">
        <span class="avatar lg">{{ initials(previewName()) }}</span>
        <div>
          <p class="eyebrow">{{ openToWork() ? 'Open to work' : 'Not looking right now' }}</p>
          <h2>{{ previewName() }}</h2>
          <p class="muted">{{ model().headline || 'Add a headline so people know what you do.' }}</p>
        </div>
        <label class="switch">
          <input type="checkbox" [checked]="openToWork()" (change)="setOpenToWork($any($event.target).checked)" />
          Open to work
        </label>
      </div>

      <div class="fields-2">
        <label>Name <input [formField]="profileForm.name" autocomplete="name" /></label>
        <label>Headline <input [formField]="profileForm.headline" placeholder="Staff Angular engineer" /></label>
      </div>
      <hs-field-error [show]="profileForm.name().touched() && profileForm.name().invalid()" [errors]="profileForm.name().errors()" />
      <div class="fields-2">
        <label>Location <input [formField]="profileForm.location" placeholder="Austin, TX or Remote" /></label>
        <label>Portfolio URL <input [formField]="profileForm.portfolioUrl" placeholder="https://" /></label>
      </div>
      <label>Bio <textarea rows="4" [formField]="profileForm.bio" placeholder="A few sentences on what you want next."></textarea></label>
      <div class="fields-2">
        <label>Desired yearly min (USD) <input type="number" [formField]="profileForm.desiredSalaryMin" /></label>
        <label>Desired yearly max (USD) <input type="number" [formField]="profileForm.desiredSalaryMax" /></label>
      </div>
      <div class="cta-row">
        <button type="submit" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save profile' }}</button>
      </div>
    </form>

    <section class="card">
      <header class="section-head">
        <div>
          <p class="eyebrow">Matching</p>
          <h2>Skills</h2>
        </div>
      </header>
      <p class="muted">Suggested people and closer roles use these. Toggle the ones you want on the public page.</p>
      @if (!catalog().length) {
        <p class="muted">The catalog is loading.</p>
      } @else {
        <div class="chips skill-picks">
          @for (skill of catalog(); track skill.slug) {
            <button
              type="button"
              class="chip quick"
              [class.active]="hasSkill(skill.slug)"
              [disabled]="skillsLocked()"
              (click)="toggleSkill(skill.slug)"
            >{{ skill.name }}</button>
          }
        </div>
      }
    </section>

    <div class="desk-grid">
      <section class="card">
        <header class="section-head">
          <div>
            <p class="eyebrow">Roles</p>
            <h2>Experience</h2>
          </div>
        </header>
        <form class="add-row cols-4" (submit)="addExperience($event)">
          <label>Title <input name="title" required placeholder="Staff engineer" /></label>
          <label>Company <input name="companyName" required placeholder="Northwind" /></label>
          <label>Started <input type="date" name="startDate" required /></label>
          <button type="submit" class="ghost">Add role</button>
        </form>
        @if (!roles().length) {
          <p class="muted">No roles yet. Add the last one first.</p>
        }
        <ul class="entry-list">
          @for (item of roles(); track item.id) {
            <li class="entry">
              <div>
                <strong>{{ item.title }}</strong>
                <p class="muted">{{ item.companyName }}</p>
              </div>
              <button type="button" class="quiet" (click)="removeExperience(item.id)">Remove</button>
            </li>
          }
        </ul>
      </section>

      <section class="card">
        <header class="section-head">
          <div>
            <p class="eyebrow">Schools</p>
            <h2>Education</h2>
          </div>
        </header>
        <form class="add-row cols-3" (submit)="addEducation($event)">
          <label>School <input name="school" required placeholder="Carnegie Mellon" /></label>
          <label>Field <input name="field" placeholder="HCI" /></label>
          <button type="submit" class="ghost">Add school</button>
        </form>
        @if (!schools().length) {
          <p class="muted">Optional, but it helps when you are early career.</p>
        }
        <ul class="entry-list">
          @for (item of schools(); track item.id) {
            <li class="entry">
              <div>
                <strong>{{ item.school }}</strong>
                <p class="muted">{{ item.field || '—' }}</p>
              </div>
              <button type="button" class="quiet" (click)="removeEducation(item.id)">Remove</button>
            </li>
          }
        </ul>
      </section>
    </div>

    <div class="desk-grid">
      <section class="card">
        <header class="section-head">
          <div>
            <p class="eyebrow">Proof</p>
            <h2>Featured work</h2>
          </div>
        </header>
        <form class="add-row cols-3" (submit)="addProject($event)">
          <label>Title <input name="title" required placeholder="Design system" /></label>
          <label>URL <input name="url" placeholder="https://" /></label>
          <button type="submit" class="ghost">Add project</button>
        </form>
        @if (!works().length) {
          <p class="muted">Link one thing you are proud of.</p>
        }
        <ul class="entry-list">
          @for (item of works(); track item.id) {
            <li class="entry">
              <strong>{{ item.title }}</strong>
              <button type="button" class="quiet" (click)="removeProject(item.id)">Remove</button>
            </li>
          }
        </ul>
      </section>

      <section class="card">
        <header class="section-head">
          <div>
            <p class="eyebrow">Apply with</p>
            <h2>Resumes</h2>
          </div>
        </header>
        @if (uploadsPaused()) {
          <p class="form-alert">New PDF uploads are paused. Pick a resume already on file, or wait until uploads are back.</p>
        }
        <label class="file-drop" [class.is-paused]="uploadsPaused()">
          <input type="file" accept="application/pdf" (change)="upload($event)" [disabled]="uploadsPaused()" />
          <strong>Drop a PDF or browse</strong>
          <span class="muted">{{ uploadsPaused() ? 'New uploads are paused. Use a resume already on file.' : 'Current resume only. 5MB max.' }}</span>
        </label>
        @if (!cvList().length) {
          <p class="muted">You need a current resume to apply from Live.</p>
        }
        <ul class="entry-list">
          @for (resume of cvList(); track resume.id) {
            <li class="entry">
              <div>
                <strong>{{ resume.fileName }}</strong>
                <p class="muted">{{ resume.isCurrent ? 'Current' : 'Previous' }}</p>
              </div>
              @if (resume.isCurrent) {
                <span class="chip open">Current</span>
              }
            </li>
          }
        </ul>
      </section>
    </div>
  `,
})
export class ProfilePage {
  private readonly http = inject(HttpClient);
  readonly auth = inject(AuthStore);
  private readonly toast = inject(ToastService);
  readonly initials = initials;
  readonly saving = signal(false);
  readonly resumes = httpResource<Resume[]>(() => `${environment.apiUrl}/me/resumes`);
  readonly health = httpResource<{ hasBlob?: boolean }>(() => `${environment.apiUrl}/health`);
  readonly skills = httpResource<Skill[]>(() => `${environment.apiUrl}/skills`);
  readonly me = httpResource<MePayload>(() =>
    this.auth.accessToken() ? `${environment.apiUrl}/me` : undefined,
  );
  readonly experience = httpResource<Array<{ id: string; title: string; companyName: string }>>(
    () => `${environment.apiUrl}/me/experience`,
  );
  readonly education = httpResource<Array<{ id: string; school: string; field: string | null }>>(
    () => `${environment.apiUrl}/me/education`,
  );
  readonly projects = httpResource<Array<{ id: string; title: string }>>(
    () => `${environment.apiUrl}/me/projects`,
  );
  readonly roles = computed(() => resourceRows(this.experience));
  readonly schools = computed(() => resourceRows(this.education));
  readonly works = computed(() => resourceRows(this.projects));
  readonly cvList = computed(() => resourceRows(this.resumes));
  readonly catalog = computed(() => this.skills.value() ?? []);
  readonly picked = computed(
    () => (this.me.value()?.userSkills ?? []).map((row) => row.skill.slug),
  );
  readonly skillsLocked = computed(() => this.me.isLoading() || Boolean(this.me.error()));
  readonly openToWork = signal(this.auth.user()?.openToWork ?? false);
  readonly openToWorkTouched = signal(false);
  readonly model = signal({
    name: this.auth.user()?.name ?? '',
    headline: this.auth.user()?.headline ?? '',
    location: this.auth.user()?.location ?? '',
    bio: this.auth.user()?.bio ?? '',
    portfolioUrl: this.auth.user()?.portfolioUrl ?? '',
    desiredSalaryMin: this.auth.user()?.desiredSalaryMin ?? 0,
    desiredSalaryMax: this.auth.user()?.desiredSalaryMax ?? 0,
  });
  readonly previewName = computed(() => this.model().name.trim() || this.auth.user()?.name || 'You');
  readonly profileForm = form(this.model, (schema) => {
    required(schema.name, { message: 'Name is required' });
  });

  constructor() {
    effect(() => {
      const user = this.auth.user();
      if (!user) {
        return;
      }
      if (user.openToWork !== undefined && !this.openToWorkTouched()) {
        this.openToWork.set(user.openToWork);
      }
      if (user.name && !this.model().name) {
        this.model.set({
          name: user.name,
          headline: user.headline ?? '',
          location: user.location ?? '',
          bio: user.bio ?? '',
          portfolioUrl: user.portfolioUrl ?? '',
          desiredSalaryMin: user.desiredSalaryMin ?? 0,
          desiredSalaryMax: user.desiredSalaryMax ?? 0,
        });
      }
    });
  }

  uploadsPaused() {
    return uploadsArePaused(this.health.value()?.hasBlob);
  }

  hasSkill(slug: string) {
    return this.picked().includes(slug);
  }

  async toggleSkill(slug: string) {
    if (this.skillsLocked()) {
      this.toast.show('Wait for your current skills to load', 'error');
      return;
    }
    const next = this.hasSkill(slug) ? this.picked().filter((item) => item !== slug) : [...this.picked(), slug];
    try {
      await firstValueFrom(this.http.post(`${environment.apiUrl}/me/skills`, { skillSlugs: next }));
      this.me.reload();
    } catch {
      this.toast.show('Could not save skills', 'error');
    }
  }

  setOpenToWork(value: boolean) {
    this.openToWork.set(value);
    this.openToWorkTouched.set(true);
  }

  async save(event: Event) {
    event.preventDefault();
    if (this.profileForm().invalid()) return;
    this.saving.set(true);
    try {
      const payload = {
        ...this.model(),
        ...(this.auth.user()?.openToWork !== undefined || this.openToWorkTouched()
          ? { openToWork: this.openToWork() }
          : {}),
      };
      await firstValueFrom(this.http.patch(`${environment.apiUrl}/me`, payload));
      await this.auth.refresh();
      this.toast.show('Profile updated', 'success');
    } catch {
      this.toast.show('Could not save profile', 'error');
    } finally {
      this.saving.set(false);
    }
  }

  async addExperience(event: Event) {
    event.preventDefault();
    const formEl = event.target as HTMLFormElement;
    const data = new FormData(formEl);
    await firstValueFrom(
      this.http.post(`${environment.apiUrl}/me/experience`, {
        title: String(data.get('title')),
        companyName: String(data.get('companyName')),
        startDate: String(data.get('startDate')),
        isCurrent: true,
      }),
    );
    formEl.reset();
    this.experience.reload();
  }

  async removeExperience(id: string) {
    await firstValueFrom(this.http.delete(`${environment.apiUrl}/me/experience/${id}`));
    this.experience.reload();
  }

  async addEducation(event: Event) {
    event.preventDefault();
    const formEl = event.target as HTMLFormElement;
    const data = new FormData(formEl);
    await firstValueFrom(
      this.http.post(`${environment.apiUrl}/me/education`, {
        school: String(data.get('school')),
        field: String(data.get('field') || ''),
      }),
    );
    formEl.reset();
    this.education.reload();
  }

  async removeEducation(id: string) {
    await firstValueFrom(this.http.delete(`${environment.apiUrl}/me/education/${id}`));
    this.education.reload();
  }

  async addProject(event: Event) {
    event.preventDefault();
    const formEl = event.target as HTMLFormElement;
    const data = new FormData(formEl);
    await firstValueFrom(
      this.http.post(`${environment.apiUrl}/me/projects`, {
        title: String(data.get('title')),
        url: String(data.get('url') || ''),
      }),
    );
    formEl.reset();
    this.projects.reload();
  }

  async removeProject(id: string) {
    await firstValueFrom(this.http.delete(`${environment.apiUrl}/me/projects/${id}`));
    this.projects.reload();
  }

  async upload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      await uploadCandidateResume(this.http, file);
      this.resumes.reload();
      this.toast.show('Resume uploaded', 'success');
    } catch {
      this.toast.show(resumeUploadErrorMessage(this.health.value()?.hasBlob), 'error');
    } finally {
      input.value = '';
    }
  }
}
