/** Tuklas landing page with searchable facility list and card stack. */
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButton, IonContent, IonIcon, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  heartOutline,
  listOutline,
  layersOutline,
  locationOutline,
  compassOutline,
  arrowForwardOutline,
  searchOutline,
} from 'ionicons/icons';
import type { Facility, FacilityCategory } from '../models/facility.model';
import { FacilityService } from '../services/facility.service';
import { FavoritesService } from '../services/favorites.service';
import { LocationService } from '../services/location.service';
import { distanceInMeters, hasFacilityCoordinates, isWithinCampus } from '../utils/geo';
import { FacilityCardComponent } from '../components/facility-card/facility-card.component';
import { CampusMapComponent } from '../components/campus-map/campus-map.component';
import { FeedbackService } from '../services/feedback.service';
const categories: FacilityCategory[] = [
  'administration',
  'food_and_halls',
  'gym_and_sports',
  'student_services',
  'science_and_tech',
  'college',
];
@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  imports: [
    FormsModule,
    IonButton,
    IonContent,
    IonIcon,
    IonSpinner,
    FacilityCardComponent,
    CampusMapComponent,
  ],
})
export class HomePage implements OnInit {
  readonly facilities = inject(FacilityService);
  readonly favorites = inject(FavoritesService);
  readonly location = inject(LocationService);
  readonly query = signal('');
  readonly category = signal<FacilityCategory | 'all'>('all');
  readonly view = signal<'list' | 'cards'>('list');
  readonly onlyFavorites = signal(false);
  readonly showAll = signal(false);
  readonly categories = categories;
  private readonly router = inject(Router);
  private readonly feedback = inject(FeedbackService);
  readonly insideCampus = computed(() =>
    isWithinCampus(this.location.position(), this.facilities.data()?.campus ?? null),
  );
  readonly visibleFacilities = computed(() => {
    const query = this.query().trim().toLowerCase();
    const items = (this.facilities.data()?.facilities ?? []).filter(
      (item) =>
        (this.category() === 'all' || item.category === this.category()) &&
        (!this.onlyFavorites() || this.favorites.has(item.mapNumber)) &&
        (!query ||
          item.name.toLowerCase().includes(query) ||
          String(item.mapNumber).includes(query)),
    );
    if (!query && this.category() === 'all' && !this.onlyFavorites()) {
      const featured = [0, 53, 1, 2, 52, 46, 3, 4];
      return items.sort((a, b) => {
        const aRank = featured.indexOf(a.mapNumber);
        const bRank = featured.indexOf(b.mapNumber);
        return (
          (aRank < 0 ? 100 + a.mapNumber : aRank) -
          (bRank < 0 ? 100 + b.mapNumber : bRank)
        );
      });
    }
    return items.sort((a, b) => this.getDistance(a) - this.getDistance(b));
  });
  readonly displayedFacilities = computed(() =>
    this.showAll() ||
    this.query().trim() ||
    this.category() !== 'all' ||
    this.onlyFavorites()
      ? this.visibleFacilities()
      : this.visibleFacilities().slice(0, 8),
  );
  constructor() {
    addIcons({
      heartOutline,
      listOutline,
      layersOutline,
      locationOutline,
      compassOutline,
      arrowForwardOutline,
      searchOutline,
    });
  }
  async ngOnInit(): Promise<void> {
    await Promise.all([this.facilities.load(), this.favorites.load()]);
    await this.location.start();
  }
  getDistance(facility: Facility): number {
    const position = this.location.position();
    return position && hasFacilityCoordinates(facility)
      ? distanceInMeters(position, facility)
      : Number.MAX_SAFE_INTEGER;
  }
  cardDistance(facility: Facility): number | null {
    return this.location.position() && hasFacilityCoordinates(facility)
      ? this.getDistance(facility)
      : null;
  }
  categoryLabel(category: FacilityCategory): string {
    return category.replaceAll('_', ' ');
  }
  openFacility(mapNumber: number): void {
    void this.router.navigate(['/facility', mapNumber]);
  }
  async toggleFavorite(mapNumber: number): Promise<void> {
    const facility = this.facilities.find(mapNumber);
    const wasSaved = this.favorites.has(mapNumber);
    await this.favorites.toggle(mapNumber);
    this.feedback.success(
      wasSaved ? 'Removed from saved places' : 'Saved to your places',
      facility?.name ?? 'Campus place',
    );
  }
  scrollToSection(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
