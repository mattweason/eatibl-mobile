import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { SupportModalPage } from './support-modal';

@NgModule({
  declarations: [
    SupportModalPage,
  ],
  imports: [
    IonicPageModule.forChild(SupportModalPage),
  ],
})
export class SupportModalPageModule {}
