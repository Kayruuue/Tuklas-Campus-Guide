/** Facility list preview. */
import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { heart, heartOutline, locationOutline } from 'ionicons/icons';
import type { Facility } from '../../models/facility.model';
import { readableDistance } from '../../utils/geo';
@Component({
  selector: 'app-facility-card',
  templateUrl: './facility-card.component.html',
  styleUrls: ['./facility-card.component.scss'],
  imports: [RouterLink, IonIcon],
})
export class FacilityCardComponent {
  readonly facility = input.required<Facility>();
  readonly distance = input<number | null>(null);
  readonly favorite = input(false);
  readonly outside = input(false);
  readonly compact = input(false);
  readonly favoriteChange = output<number>();
  imageFailed = false;
  constructor() {
    addIcons({ heart, heartOutline, locationOutline });
  }
  readonly distanceText = () => readableDistance(this.distance());
  onImageError(): void {
    this.imageFailed = true;
  }
  favoriteClicked(event: MouseEvent): void {
    event.stopPropagation();
    this.favoriteChange.emit(this.facility().mapNumber);
  }
}
