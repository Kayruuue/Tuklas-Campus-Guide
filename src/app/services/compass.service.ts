/** Supplies a live compass heading for the navigation arrow. */
import { Injectable, signal } from '@angular/core';
import {
  Capacitor,
  registerPlugin,
  type PluginListenerHandle,
} from '@capacitor/core';
import { Motion } from '@capacitor/motion';

interface CampusCompassPlugin {
  start(): Promise<{ available: boolean }>;
  stop(): Promise<void>;
  addListener(
    eventName: 'heading',
    listener: (event: { heading: number }) => void,
  ): Promise<PluginListenerHandle>;
}

const nativeCompass = registerPlugin<CampusCompassPlugin>('CampusCompass');

@Injectable({ providedIn: 'root' })
export class CompassService {
  readonly heading = signal<number | null>(null);
  readonly message = signal('Finding your compass heading…');

  private nativeListener: PluginListenerHandle | null = null;
  private motionListener: PluginListenerHandle | null = null;
  private starting: Promise<void> | null = null;
  private absoluteActive = false;

  private readonly onAbsoluteOrientation = (event: Event): void => {
    const alpha = (event as DeviceOrientationEvent).alpha;
    if (typeof alpha !== 'number') return;

    this.absoluteActive = true;
    this.setHeading(360 - alpha);
  };

  start(): Promise<void> {
    if (this.nativeListener || this.motionListener) return Promise.resolve();
    if (this.starting) return this.starting;

    this.starting = this.begin().finally(() => {
      this.starting = null;
    });
    return this.starting;
  }

  private async begin(): Promise<void> {
    this.message.set('Finding your compass heading…');

    if (Capacitor.getPlatform() === 'android') {
      try {
        const listener = await nativeCompass.addListener('heading', (event) => {
          this.setHeading(event.heading);
        });
        const result = await nativeCompass.start();
        if (result.available) {
          this.nativeListener = listener;
          return;
        }
        await listener.remove();
      } catch {
        // Use browser orientation on devices without a native compass sensor.
      }
    }

    window.addEventListener('deviceorientationabsolute', this.onAbsoluteOrientation);
    try {
      this.motionListener = await Motion.addListener('orientation', (event) => {
        if (this.absoluteActive || typeof event.alpha !== 'number') return;
        this.setHeading(360 - event.alpha);
      });
    } catch {
      this.message.set('Compass is unavailable. Use the approximate direction.');
    }
  }

  private setHeading(value: number): void {
    if (!Number.isFinite(value)) return;
    this.heading.set(((value % 360) + 360) % 360);
    this.message.set('Compass is active.');
  }

  async stop(): Promise<void> {
    if (this.starting) await this.starting;

    window.removeEventListener('deviceorientationabsolute', this.onAbsoluteOrientation);
    this.absoluteActive = false;

    if (this.motionListener) await this.motionListener.remove();
    this.motionListener = null;

    if (this.nativeListener) {
      await nativeCompass.stop();
      await this.nativeListener.remove();
    }
    this.nativeListener = null;
    this.heading.set(null);
  }
}
