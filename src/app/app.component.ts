import { Component, inject } from '@angular/core';
import { IonApp, IonIcon, IonRouterOutlet } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmark, closeOutline } from 'ionicons/icons';
import { FeedbackService } from './services/feedback.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [IonApp, IonIcon, IonRouterOutlet],
})
export class AppComponent {
  readonly feedback = inject(FeedbackService);

  constructor() {
    addIcons({ checkmark, closeOutline });
  }
}
