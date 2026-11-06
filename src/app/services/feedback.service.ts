import { Injectable, signal } from '@angular/core';
import { Haptics, NotificationType } from '@capacitor/haptics';

export interface FeedbackNotice {
  title: string;
  detail: string;
}

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  readonly notice = signal<FeedbackNotice | null>(null);
  private timeout: ReturnType<typeof setTimeout> | null = null;

  success(title: string, detail: string): void {
    if (this.timeout) clearTimeout(this.timeout);
    this.notice.set({ title, detail });
    this.timeout = setTimeout(() => this.dismiss(), 6000);
    // The web plugin uses the browser vibration API when available.
    void Haptics.notification({ type: NotificationType.Success }).catch(() => {});
  }

  dismiss(): void {
    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = null;
    this.notice.set(null);
  }
}
