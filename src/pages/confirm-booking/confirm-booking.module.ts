import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { ConfirmBookingPage } from './confirm-booking';

@NgModule({
  declarations: [
    ConfirmBookingPage,
  ],
  imports: [
    IonicPageModule.forChild(ConfirmBookingPage),
  ],
})
export class ConfirmBookingPageModule {}
