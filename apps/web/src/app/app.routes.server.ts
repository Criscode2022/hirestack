import { RenderMode, type ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Server },
  { path: 'jobs', renderMode: RenderMode.Server },
  { path: 'jobs/:slug', renderMode: RenderMode.Server },
  { path: 'companies/:slug', renderMode: RenderMode.Server },
  { path: '**', renderMode: RenderMode.Client },
];
