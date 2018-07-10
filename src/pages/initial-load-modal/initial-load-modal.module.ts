import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { InitialLoadModalPage } from './initial-load-modal';

@NgModule({
  declarations: [
    InitialLoadModalPage,
  ],
  imports: [
    IonicPageModule.forChild(InitialLoadModalPage),
  ],
})
export class InitialLoadModalPageModule {}
