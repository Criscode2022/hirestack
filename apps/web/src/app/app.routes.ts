import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/guards';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/landing/landing').then((m) => m.LandingPage),
  },
  {
    path: 'jobs',
    loadComponent: () => import('./features/jobs/job-list').then((m) => m.JobListPage),
  },
  {
    path: 'jobs/:slug',
    loadComponent: () => import('./features/jobs/job-detail').then((m) => m.JobDetailPage),
  },
  {
    path: 'jobs/:slug/apply',
    canActivate: [authGuard, roleGuard('CANDIDATE')],
    loadComponent: () => import('./features/jobs/apply').then((m) => m.ApplyPage),
  },
  {
    path: 'companies/:slug',
    loadComponent: () => import('./features/companies/company-public').then((m) => m.CompanyPublicPage),
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register').then((m) => m.RegisterPage),
  },
  {
    path: 'profile',
    canActivate: [authGuard, roleGuard('CANDIDATE')],
    loadComponent: () => import('./features/profile/profile').then((m) => m.ProfilePage),
  },
  {
    path: 'applications',
    canActivate: [authGuard, roleGuard('CANDIDATE')],
    loadComponent: () => import('./features/applications/tracker').then((m) => m.TrackerPage),
  },
  {
    path: 'saved',
    canActivate: [authGuard, roleGuard('CANDIDATE')],
    loadComponent: () => import('./features/applications/saved').then((m) => m.SavedJobsPage),
  },
  {
    path: 'employer',
    canActivate: [authGuard, roleGuard('EMPLOYER')],
    loadComponent: () => import('./features/employer/dashboard').then((m) => m.EmployerDashboardPage),
  },
  {
    path: 'employer/company',
    canActivate: [authGuard, roleGuard('EMPLOYER')],
    loadComponent: () => import('./features/employer/company').then((m) => m.CompanySettingsPage),
  },
  {
    path: 'employer/jobs/new',
    canActivate: [authGuard, roleGuard('EMPLOYER')],
    loadComponent: () => import('./features/employer/job-form').then((m) => m.JobFormPage),
  },
  {
    path: 'employer/jobs/:id/edit',
    canActivate: [authGuard, roleGuard('EMPLOYER')],
    loadComponent: () => import('./features/employer/job-form').then((m) => m.JobFormPage),
  },
  {
    path: 'employer/jobs/:id/inbox',
    canActivate: [authGuard, roleGuard('EMPLOYER')],
    loadComponent: () => import('./features/employer/inbox').then((m) => m.InboxPage),
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard('ADMIN')],
    loadComponent: () => import('./features/admin/admin').then((m) => m.AdminPage),
  },
  {
    path: 'forbidden',
    loadComponent: () => import('./features/errors/errors').then((m) => m.ForbiddenPage),
  },
  {
    path: '**',
    loadComponent: () => import('./features/errors/errors').then((m) => m.NotFoundPage),
  },
];
