import { Service, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  kind: 'success' | 'error' | 'info';
}

@Service()
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private nextId = 1;

  show(message: string, kind: Toast['kind'] = 'info') {
    const id = this.nextId++;
    this.toasts.update((items) => [...items, { id, message, kind }]);
    setTimeout(() => this.dismiss(id), 4200);
  }

  dismiss(id: number) {
    this.toasts.update((items) => items.filter((item) => item.id !== id));
  }
}
