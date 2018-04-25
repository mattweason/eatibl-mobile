import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { BookingsPage } from './bookings';
import { BookingCardModule } from "../../components/booking-card/booking-card.module";

@NgModule({
  declarations: [
    BookingsPage,
  ],
  imports: [
    IonicPageModule.forChild(BookingsPage),
    BookingCardModule
  ]
})
export class BookingsPageModule {}
