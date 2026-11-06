/** Watches device GPS while the user is inside the Tuklas app. */
import { Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Geolocation, type WatchPositionCallback } from '@capacitor/geolocation';
import type { UserPosition } from '../models/facility.model';

@Injectable({ providedIn: 'root' })
export class LocationService {
  readonly position = signal<UserPosition | null>(null);
  readonly message = signal('Location has not been requested.');

  private watchId: string | null = null;
  private starting: Promise<void> | null = null;

  start(): Promise<void> {
    if (this.watchId) return Promise.resolve();
    if (this.starting) return this.starting;

    this.starting = this.beginWatch().finally(() => {
      this.starting = null;
    });
    return this.starting;
  }

  async retry(): Promise<void> {
    try {
      await this.stop();
    } catch {
      // Android may have already closed a watch after a location error.
      this.watchId = null;
    }
    await this.start();
  }

  private async beginWatch(): Promise<void> {
    try {
      // The Capacitor web implementation delegates watchPosition to the browser,
      // but requestPermissions is only implemented on native platforms.
      if (Capacitor.isNativePlatform()) {
        const permission = await Geolocation.requestPermissions();
        if (
          permission.location !== 'granted' &&
          permission.coarseLocation !== 'granted'
        ) {
          this.message.set(
            'Location permission was denied. You can still browse the campus facilities.',
          );
          return;
        }
      }

      this.message.set('Finding your location…');
      const callback: WatchPositionCallback = (location, error) => {
        if (error) {
          this.message.set(this.errorMessage(error));
          return;
        }
        if (!location) return;

        this.position.set({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        this.message.set('Live location is active.');
      };
      this.watchId = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 30_000,
          maximumAge: 60_000,
          interval: 5_000,
        },
        callback,
      );
    } catch (error) {
      this.message.set(this.errorMessage(error));
    }
  }

  private errorMessage(error: unknown): string {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String(error.code)
        : '';

    switch (code) {
      case '1':
      case 'OS-PLUG-GLOC-0003':
        return 'Location permission is denied. Allow location for Tuklas in your phone settings, then retry.';
      case 'OS-PLUG-GLOC-0007':
      case 'OS-PLUG-GLOC-0009':
      case 'OS-PLUG-GLOC-0017':
        return 'Turn on Location in your phone’s Quick Settings, then retry.';
      case '3':
      case 'OS-PLUG-GLOC-0010':
        return 'Still waiting for a GPS fix. Move outdoors or near a window, then retry.';
      case 'OS-PLUG-GLOC-0014':
      case 'OS-PLUG-GLOC-0015':
      case 'OS-PLUG-GLOC-0016':
        return 'Android location services could not start. Turn on Location and Wi-Fi or mobile data, then retry.';
      default:
        return 'Location is unavailable. Check that your phone’s Location switch is on, then retry.';
    }
  }

  async stop(): Promise<void> {
    if (this.starting) await this.starting;
    if (this.watchId) await Geolocation.clearWatch({ id: this.watchId });
    this.watchId = null;
  }
}
