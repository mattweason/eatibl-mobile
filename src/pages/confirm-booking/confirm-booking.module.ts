import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { ConfirmBookingPage } from './confirm-booking';

import { InputMasksModule } from '../../directives/input-masks/input-masks.module'

@NgModule({
  declarations: [
    ConfirmBookingPage,
  ],
  imports: [
    IonicPageModule.forChild(ConfirmBookingPage),
    InputMasksModule
  ]
})
export class ConfirmBookingPageModule {}
