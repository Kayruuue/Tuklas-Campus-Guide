/** Save favorite facilities. */
import { Injectable, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
@Injectable({ providedIn: 'root' })
export class FavoritesService {
  readonly ids = signal<number[]>([]);
  async load(): Promise<void> {
    const saved = await Preferences.get({ key: 'campus-guide-favorites' });
    this.ids.set(saved.value ? (JSON.parse(saved.value) as number[]) : []);
  }
  has(id: number): boolean {
    return this.ids().includes(id);
  }
  async toggle(id: number): Promise<void> {
    const next = this.has(id)
      ? this.ids().filter((value) => value !== id)
      : [...this.ids(), id];
    await Preferences.set({
      key: 'campus-guide-favorites',
      value: JSON.stringify(next),
    });
    this.ids.set(next);
  }
}
