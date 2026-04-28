import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class UserAgentService {
  async getIpAddress(): Promise<string> {
    try {
      const response = await fetch('https://httpbin.org/ip', { method: 'GET' });

      if (!response.ok) {
        return 'unknown';
      }

      const data = (await response.json()) as { origin?: string };
      return data.origin ?? 'unknown';
    } catch (error) {
      console.warn('Could not fetch IP address:', error);
      return 'unknown';
    }
  }

  getUserAgent(): string {
    return window.navigator.userAgent;
  }
}
