import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { PromocodeModalPage } from './promocode-modal';

@NgModule({
  declarations: [
    PromocodeModalPage,
  ],
  imports: [
    IonicPageModule.forChild(PromocodeModalPage),
  ],
})
export class PromocodeModalPageModule {}
