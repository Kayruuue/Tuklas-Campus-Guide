/** Draws the campus, selected destination, and a route over mapped campus paths. */
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';
import * as L from 'leaflet';
import type { Campus, Facility, UserPosition } from '../../models/facility.model';
import { distanceInMeters, hasFacilityCoordinates } from '../../utils/geo';

@Component({
  selector: 'app-campus-map',
  templateUrl: './campus-map.component.html',
  styleUrls: ['./campus-map.component.scss'],
})
export class CampusMapComponent implements AfterViewInit, OnDestroy {
  readonly campus = input.required<Campus>();
  readonly facilities = input<Facility[]>([]);
  readonly facility = input<Facility | null>(null);
  readonly position = input<UserPosition | null>(null);
  readonly navigation = input(false);
  readonly featured = input(false);
  readonly routePoints = input<UserPosition[] | null>(null);
  readonly routeKind = input<'mapped' | 'direct' | 'none'>('none');
  readonly facilitySelected = output<number>();
  readonly mapElement = viewChild.required<ElementRef<HTMLDivElement>>('map');
  selectedView: 'campus' | 'me' | 'facility' = 'campus';
  tileError = false;

  private map?: L.Map;
  private positionMarker?: L.CircleMarker;
  private destinationMarker?: L.Marker;
  private routeLine?: L.Polyline;
  private facilityPins?: L.LayerGroup;
  private resizeObserver?: ResizeObserver;
  private lastFacilityNumber: number | null = null;
  followLocation = false;
  private hasCenteredOnLocation = false;
  private hasMovedSinceStart = false;
  private lastPosition: UserPosition | null = null;

  constructor() {
    effect(() => {
      const position = this.position();
      const facility = this.facility();
      const facilities = this.facilities();
      const route = this.routePoints();
      const navigation = this.navigation();
      if (this.map) this.refreshMap(position, facility, facilities, route, navigation);
    });
  }

  ngAfterViewInit(): void {
    const campus = this.campus();
    this.followLocation = this.navigation();
    const entrance: L.LatLngExpression = [
      campus.entrance.latitude,
      campus.entrance.longitude,
    ];
    this.map = L.map(this.mapElement().nativeElement, {
      zoomControl: false,
      scrollWheelZoom: false,
      zoomSnap: this.navigation() ? 0.25 : 1,
    }).setView(entrance, 17);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    })
      .on('tileerror', () => {
        this.tileError = true;
      })
      .addTo(this.map);
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);
    if (this.navigation() && !this.facility()?.isEntrance) {
      L.circleMarker(entrance, {
        radius: 7,
        weight: 3,
        color: '#fff',
        fillColor: '#e3af64',
        fillOpacity: 1,
      })
        .addTo(this.map)
        .bindPopup(campus.entrance.label);
    }
    this.facilityPins = L.layerGroup().addTo(this.map);
    this.refreshMap(
      this.position(),
      this.facility(),
      this.facilities(),
      this.routePoints(),
      this.navigation(),
    );
    if (!this.navigation() && !this.facility()) this.focusCampus();
    this.resizeObserver = new ResizeObserver(() => this.refreshView());
    this.resizeObserver.observe(this.mapElement().nativeElement);
    setTimeout(() => this.refreshView(), 0);
  }

  private refreshMap(
    position: UserPosition | null,
    facility: Facility | null,
    facilities: Facility[],
    route: UserPosition[] | null,
    navigation: boolean,
  ): void {
    if (!this.map) return;
    const positionChanged =
      !!position &&
      (!this.lastPosition ||
        position.latitude !== this.lastPosition.latitude ||
        position.longitude !== this.lastPosition.longitude);
    if (
      navigation &&
      position &&
      this.lastPosition &&
      distanceInMeters(position, this.lastPosition) > 5
    ) {
      this.hasMovedSinceStart = true;
    }
    this.positionMarker?.remove();
    if (position) {
      this.positionMarker = L.circleMarker([position.latitude, position.longitude], {
        radius: 9,
        weight: 3,
        color: '#fff',
        fillColor: '#516ac8',
        fillOpacity: 1,
      })
        .addTo(this.map)
        .bindPopup('Your current location');
    }

    this.facilityPins?.clearLayers();
    for (const place of navigation ? [] : facilities) {
      if (!hasFacilityCoordinates(place) || place.mapNumber === facility?.mapNumber)
        continue;
      L.marker([place.latitude, place.longitude], {
        icon: this.numberIcon(place.mapNumber),
        title: place.isEntrance
          ? 'Campus entrance'
          : `Map ${place.mapNumber}: ${place.name}`,
      })
        .addTo(this.facilityPins!)
        .bindTooltip(place.isEntrance ? place.name : `${place.mapNumber} · ${place.name}`)
        .on('click', () => this.facilitySelected.emit(place.mapNumber));
    }

    this.destinationMarker?.remove();
    this.routeLine?.remove();
    if (facility && hasFacilityCoordinates(facility)) {
      const destination: L.LatLngExpression = [facility.latitude, facility.longitude];
      this.destinationMarker = L.marker(destination, {
        icon: this.numberIcon(facility.mapNumber, true),
        title: `Destination: ${facility.name}`,
      })
        .addTo(this.map)
        .bindPopup(facility.name);
      const campus = this.campus();
      const start = route?.[0] ?? campus.entrance;
      const origin: L.LatLngExpression = [start.latitude, start.longitude];
      if (route?.length && route.length > 1) {
        this.routeLine = L.polyline(
          route.map((point) => [point.latitude, point.longitude]),
          {
            color: '#1677ff',
            weight: 5,
            opacity: 0.95,
            lineCap: 'round',
            dashArray: this.routeKind() === 'direct' ? '9 8' : undefined,
          },
        ).addTo(this.map);
      }
      if (
        this.lastFacilityNumber !== facility.mapNumber &&
        !(navigation && this.followLocation && position && route?.length)
      ) {
        this.selectedView = 'facility';
        this.fitDestination(
          route?.map((point) => [point.latitude, point.longitude]) ?? [
            origin,
            destination,
          ],
          navigation,
        );
      }
    } else if (this.lastFacilityNumber !== facility?.mapNumber && navigation) {
      this.map.setView(
        [this.campus().entrance.latitude, this.campus().entrance.longitude],
        17,
      );
    }
    if (
      position &&
      this.followLocation &&
      (positionChanged || this.selectedView !== 'me' || !!route)
    ) {
      this.selectedView = 'me';
      if (navigation && !this.hasMovedSinceStart && route?.length) {
        this.fitDestination(
          route.map((point) => [point.latitude, point.longitude]),
          true,
        );
      } else if (positionChanged || !this.hasCenteredOnLocation) {
        this.map.setView(
          [position.latitude, position.longitude],
          this.hasCenteredOnLocation ? this.map.getZoom() : 17,
          { animate: false },
        );
      }
      this.hasCenteredOnLocation = true;
    }
    this.lastPosition = position ? { ...position } : null;
    this.lastFacilityNumber = facility?.mapNumber ?? null;
  }

  private numberIcon(mapNumber: number, selected = false): L.DivIcon {
    return L.divIcon({
      className: `number-pin${selected ? ' selected' : ''}`,
      html: `<span>${mapNumber === 0 ? 'E' : mapNumber}</span>`,
      iconSize: selected ? [28, 28] : [25, 25],
      iconAnchor: selected ? [14, 14] : [12, 12],
    });
  }

  /** Ionic can create the map before a pushed page becomes visible. */
  refreshView(): void {
    if (!this.map) return;
    this.map.invalidateSize({ pan: false });
    const position = this.position();
    if (this.followLocation && position) {
      this.selectedView = 'me';
      const route = this.routePoints();
      if (this.navigation() && !this.hasMovedSinceStart && route?.length) {
        this.fitDestination(
          route.map((point) => [point.latitude, point.longitude]),
          true,
        );
      } else {
        this.map.setView(
          [position.latitude, position.longitude],
          this.hasCenteredOnLocation ? this.map.getZoom() : 17,
          { animate: false },
        );
      }
      this.hasCenteredOnLocation = true;
      return;
    }
    const facility = this.facility();
    if (!facility || !hasFacilityCoordinates(facility)) {
      if (!this.navigation() && this.selectedView === 'campus') this.fitCampusBounds();
      return;
    }
    const route = this.routePoints();
    const start = route?.[0] ?? this.campus().entrance;
    const coordinates: L.LatLngExpression[] = route?.map((point) => [
      point.latitude,
      point.longitude,
    ]) ?? [
      [start.latitude, start.longitude],
      [facility.latitude, facility.longitude],
    ];
    this.fitDestination(coordinates, this.navigation());
  }

  private fitDestination(coordinates: L.LatLngExpression[], navigation: boolean): void {
    this.map?.fitBounds(
      L.latLngBounds(coordinates),
      navigation
        ? {
            maxZoom: 18,
            paddingTopLeft: [36, 64],
            paddingBottomRight: [36, 40],
            animate: false,
          }
        : { maxZoom: 18, animate: false },
    );
  }

  focusCampus(): void {
    this.followLocation = false;
    if (this.navigation()) {
      this.selectedView = 'facility';
      this.refreshView();
      return;
    }
    this.selectedView = 'campus';
    this.fitCampusBounds();
  }

  private fitCampusBounds(): void {
    const campus = this.campus();
    const points: L.LatLngExpression[] = [
      [campus.entrance.latitude, campus.entrance.longitude],
      ...this.facilities()
        .filter(hasFacilityCoordinates)
        .map((place): L.LatLngExpression => [place.latitude, place.longitude]),
    ];
    this.map?.fitBounds(L.latLngBounds(points).pad(0.12), {
      maxZoom: 17,
      animate: false,
    });
  }

  focusPosition(): void {
    const position = this.position();
    if (!position) return;
    this.followLocation = true;
    this.hasMovedSinceStart = true;
    this.hasCenteredOnLocation = true;
    this.selectedView = 'me';
    this.map?.setView(
      [position.latitude, position.longitude],
      this.navigation() ? 16 : 17,
    );
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.map?.remove();
  }
}
