import { Injectable, computed, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class HttpLoadingService {
  private readonly pendingRequests = signal(0);

  readonly isLoading = computed(() => this.pendingRequests() > 0);

  start(): void {
    this.pendingRequests.update((current) => current + 1);
  }

  stop(): void {
    this.pendingRequests.update((current) => (current > 0 ? current - 1 : 0));
  }
}
