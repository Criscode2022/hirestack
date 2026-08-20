import { RenderMode, type ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Server },
  { path: 'jobs', renderMode: RenderMode.Server },
  { path: 'jobs/:slug', renderMode: RenderMode.Server },
  { path: 'companies/:slug', renderMode: RenderMode.Server },
  { path: 'feed', renderMode: RenderMode.Server },
  { path: 'people', renderMode: RenderMode.Server },
  { path: 'people/:id', renderMode: RenderMode.Server },
  { path: 'companies', renderMode: RenderMode.Server },
  { path: 'search', renderMode: RenderMode.Server },
  { path: 'insights', renderMode: RenderMode.Server },
  { path: '**', renderMode: RenderMode.Client },
];
