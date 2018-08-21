import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { BookingConfirmedPage } from './booking-confirmed';
import {Ionic2RatingModule} from 'ionic2-rating';

@NgModule({
  declarations: [
    BookingConfirmedPage,
  ],
  imports: [
    IonicPageModule.forChild(BookingConfirmedPage),
    Ionic2RatingModule
  ]
})
export class BookingConfirmedPageModule {}
