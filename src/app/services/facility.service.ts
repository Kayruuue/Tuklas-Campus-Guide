/** Load campus facilities. */
import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type {
  CampusData,
  CampusPaths,
  Facility,
} from '../models/facility.model';

@Injectable({ providedIn: 'root' })
export class FacilityService {
  readonly data = signal<CampusData | null>(null);
  readonly paths = signal<CampusPaths | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  constructor(private readonly http: HttpClient) {}
  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const [data, paths] = await Promise.all([
        firstValueFrom(
          this.http.get<CampusData>('assets/data/facilities.json'),
        ),
        firstValueFrom(
          this.http.get<CampusPaths>('assets/data/campus-paths.json'),
        ).catch(() => null),
      ]);
      const entrance: Facility = {
        id: 0,
        mapNumber: 0,
        name: 'Campus Entrance',
        category: 'student_services',
        description:
          'Mahogany Avenue gate on the east side of NEUST Sumacab. Choose this destination to find your way out of campus.',
        latitude: data.campus.entrance.latitude,
        longitude: data.campus.entrance.longitude,
        positionSource: 'official-map-estimate',
        isEntrance: true,
        imagePath: 'assets/images/facilities/entrance.jpg',
      };
      this.data.set({ ...data, facilities: [entrance, ...data.facilities] });
      this.paths.set(paths);
    } catch {
      this.error.set(
        'Campus facilities could not be loaded. Check the bundled JSON file and try again.',
      );
    } finally {
      this.loading.set(false);
    }
  }
  find(mapNumber: number): Facility | undefined {
    return this.data()?.facilities.find(
      (facility) => facility.mapNumber === mapNumber,
    );
  }
}
