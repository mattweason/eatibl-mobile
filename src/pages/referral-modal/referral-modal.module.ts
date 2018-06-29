import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { ReferralModalPage } from './referral-modal';

@NgModule({
  declarations: [
    ReferralModalPage,
  ],
  imports: [
    IonicPageModule.forChild(ReferralModalPage),
  ],
})
export class ReferralModalPageModule {}
