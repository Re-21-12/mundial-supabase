import { Injectable, computed, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class HttpLoadingService {
  // Raw counter updated synchronously; signal is only written once per
  // microtask checkpoint so bursts of concurrent start()/stop() calls
  // (e.g. 5 parallel Supabase REST requests) produce a single signal
  // update instead of N separate writes that each re-schedule Angular CD,
  // which would trigger NG0103 in zoneless mode.
  private count = 0;
  private flushQueued = false;
  private readonly pendingRequests = signal(0);

  readonly isLoading = computed(() => this.pendingRequests() > 0);

  start(): void {
    this.count++;
    this.queueFlush();
  }

  stop(): void {
    if (this.count > 0) this.count--;
    this.queueFlush();
  }

  private queueFlush(): void {
    if (this.flushQueued) return;
    this.flushQueued = true;
    queueMicrotask(() => {
      this.flushQueued = false;
      this.pendingRequests.set(this.count);
    });
  }
}
