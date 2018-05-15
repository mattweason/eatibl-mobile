import { NgModule } from '@angular/core';
import { IonicModule } from 'ionic-angular';
import { BookingCardComponent } from './booking-card';

@NgModule({
  declarations: [
    BookingCardComponent
  ],
  imports: [
    IonicModule
  ],
  exports: [
    BookingCardComponent
  ]
})
export class BookingCardModule {}
