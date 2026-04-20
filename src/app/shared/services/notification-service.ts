import { inject, Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';
@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private messageService = inject(MessageService);

  notify(severity: 'success' | 'error' | 'info' | 'warn', summary: string, detail: string) {
    this.messageService.add({ severity, summary, detail });
  }
}
