/** Campus facility details. */
import { Component, computed, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonSpinner,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  businessOutline,
  heart,
  heartOutline,
  imageOutline,
  locationOutline,
  navigateOutline,
  timeOutline,
} from 'ionicons/icons';
import { FacilityService } from '../services/facility.service';
import { FavoritesService } from '../services/favorites.service';
import { FeedbackService } from '../services/feedback.service';
import { LocationService } from '../services/location.service';
import {
  distanceInMeters,
  hasFacilityCoordinates,
  readableDistance,
} from '../utils/geo';
import { findCampusRoute } from '../utils/campus-routing';

@Component({
  selector: 'app-facility-detail',
  templateUrl: './facility-detail.page.html',
  styleUrls: ['./facility-detail.page.scss'],
  imports: [
    RouterLink,
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonSpinner,
    IonToolbar,
  ],
})
export class FacilityDetailPage implements OnInit {
  readonly service = inject(FacilityService);
  readonly favorites = inject(FavoritesService);
  readonly location = inject(LocationService);
  private readonly feedback = inject(FeedbackService);
  private readonly route = inject(ActivatedRoute);
  readonly number = Number(this.route.snapshot.paramMap.get('mapNumber'));
  readonly facility = computed(() => this.service.find(this.number));
  readonly walkingRoute = computed(() => {
    const item = this.facility();
    const campus = this.service.data()?.campus;
    const start =
      this.location.position() ?? (item?.isEntrance ? null : campus?.entrance);

    if (!item || !campus || !start || !hasFacilityCoordinates(item)) {
      return null;
    }

    return findCampusRoute(start, item, campus.entrance, this.service.paths());
  });
  imageFailed = false;

  constructor() {
    addIcons({
      businessOutline,
      heart,
      heartOutline,
      imageOutline,
      locationOutline,
      navigateOutline,
      timeOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    if (!this.service.data()) await this.service.load();
    await this.favorites.load();
    await this.location.start();
  }

  async toggleFavorite(): Promise<void> {
    const item = this.facility();
    if (!item) return;
    const wasSaved = this.favorites.has(item.mapNumber);
    await this.favorites.toggle(item.mapNumber);
    this.feedback.success(
      wasSaved ? 'Removed from saved places' : 'Saved to your places',
      item.name,
    );
  }

  distanceLabel(): string {
    return this.walkingRoute()
      ? 'Mapped walking distance'
      : 'Straight-line distance';
  }
  distance(): string {
    const item = this.facility();
    const campus = this.service.data()?.campus;
    const pos =
      this.location.position() ?? (item?.isEntrance ? null : campus?.entrance);
    if (!item || !pos || !hasFacilityCoordinates(item)) {
      return 'Location unavailable';
    }

    return readableDistance(
      this.walkingRoute()?.distanceMeters ?? distanceInMeters(pos, item),
    );
  }
}
