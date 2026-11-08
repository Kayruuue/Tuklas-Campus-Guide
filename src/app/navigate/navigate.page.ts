/** Navigate to selected facilities. */
import {
  Component,
  computed,
  effect,
  inject,
  OnDestroy,
  OnInit,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Haptics } from '@capacitor/haptics';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonSpinner,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowUp,
  checkmarkCircle,
  compassOutline,
  imageOutline,
  locationOutline,
  navigateOutline,
} from 'ionicons/icons';
import { CampusMapComponent } from '../components/campus-map/campus-map.component';
import { FacilityService } from '../services/facility.service';
import { LocationService } from '../services/location.service';
import { CompassService } from '../services/compass.service';
import { FeedbackService } from '../services/feedback.service';
import {
  bearingInDegrees,
  distanceInMeters,
  hasFacilityCoordinates,
  isWithinCampus,
  readableDistance,
} from '../utils/geo';
import { findCampusRoute } from '../utils/campus-routing';

@Component({
  selector: 'app-navigate',
  templateUrl: './navigate.page.html',
  styleUrls: ['./navigate.page.scss'],
  imports: [
    RouterLink,
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonFooter,
    IonHeader,
    IonIcon,
    IonSpinner,
    IonToolbar,
    CampusMapComponent,
  ],
})
export class NavigatePage implements OnInit, OnDestroy {
  imageFailed = false;
  private readonly campusMap = viewChild(CampusMapComponent);
  readonly service = inject(FacilityService);
  readonly location = inject(LocationService);
  readonly compass = inject(CompassService);
  private readonly feedback = inject(FeedbackService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private arrivalNotified = false;

  readonly item = computed(() =>
    this.service.find(Number(this.route.snapshot.paramMap.get('mapNumber'))),
  );
  readonly hasDestination = computed(
    () => !!this.item() && hasFacilityCoordinates(this.item()!),
  );
  readonly hasLiveLocation = computed(() => !!this.location.position());
  readonly insideCampus = computed(() =>
    isWithinCampus(
      this.location.position(),
      this.service.data()?.campus ?? null,
    ),
  );
  readonly start = computed(() => {
    const campus = this.service.data()?.campus;
    return (
      this.location.position() ??
      (this.item()?.isEntrance ? null : (campus?.entrance ?? null))
    );
  });
  readonly directDistance = computed(() => {
    const item = this.item();
    const start = this.start();
    return item && start && hasFacilityCoordinates(item)
      ? distanceInMeters(start, item)
      : null;
  });
  readonly walkingRoute = computed(() => {
    const item = this.item();
    const start = this.start();
    const campus = this.service.data()?.campus;
    if (!item || !start || !campus || !hasFacilityCoordinates(item))
      return null;
    return findCampusRoute(start, item, campus.entrance, this.service.paths());
  });
  readonly directGuide = computed(() => {
    const start = this.start();
    const item = this.item();
    return !this.walkingRoute() && start && item && hasFacilityCoordinates(item)
      ? [start, item]
      : null;
  });
  readonly routeKind = computed<'mapped' | 'direct' | 'none'>(() =>
    this.walkingRoute() ? 'mapped' : this.directGuide() ? 'direct' : 'none',
  );
  readonly displayedPoints = computed(
    () => this.walkingRoute()?.points ?? this.directGuide(),
  );
  readonly distance = computed(
    () =>
      this.walkingRoute()?.distanceMeters ??
      (this.directGuide() ? this.directDistance() : null),
  );
  readonly arrived = computed(
    () =>
      (this.item()?.positionSource === 'osm' || this.item()?.isEntrance) &&
      this.hasLiveLocation() &&
      (this.insideCampus() || !!this.item()?.isEntrance) &&
      this.directDistance() !== null &&
      this.directDistance()! <= 15,
  );
  readonly rotation = computed(() => {
    const start = this.start();
    const next = this.displayedPoints()?.find(
      (point) => start && distanceInMeters(start, point) > 5,
    );
    if (!start || !next) return 0;
    return (
      (bearingInDegrees(start, next) - (this.compass.heading() ?? 0) + 360) %
      360
    );
  });

  constructor() {
    addIcons({
      arrowUp,
      checkmarkCircle,
      compassOutline,
      imageOutline,
      locationOutline,
      navigateOutline,
    });
    effect(() => {
      if (!this.arrived() || this.arrivalNotified) return;
      this.arrivalNotified = true;
      this.feedback.success(
        'Destination reached',
        this.item()?.name ?? 'You have arrived.',
      );
    });
  }

  async ngOnInit(): Promise<void> {
    if (!this.service.data()) await this.service.load();
    await Promise.all([this.location.start(), this.compass.start()]);
  }

  ngOnDestroy(): void {
    void this.compass.stop().catch(() => {});
  }
  ionViewWillEnter(): void {
    void this.compass.start();
  }
  ionViewDidLeave(): void {
    void this.compass.stop().catch(() => {});
  }
  ionViewDidEnter(): void {
    this.campusMap()?.refreshView();
  }
  readableDistance(): string {
    return readableDistance(this.distance());
  }
  walkingMinutes(): string {
    return this.distance() === null
      ? '—'
      : String(Math.max(1, Math.ceil(this.distance()! / 84)));
  }

  async endNavigation(): Promise<void> {
    const facility = this.item();
    if (!facility) return;

    await Haptics.vibrate({ duration: 250 }).catch(() => {});
    await this.router.navigate(['/facility', facility.mapNumber]);
  }
}
