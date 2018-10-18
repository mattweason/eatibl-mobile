import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { HowItWorksModalPage } from './how-it-works-modal';

@NgModule({
  declarations: [
    HowItWorksModalPage,
  ],
  imports: [
    IonicPageModule.forChild(HowItWorksModalPage),
  ],
})
export class HowItWorksModalPageModule {}
