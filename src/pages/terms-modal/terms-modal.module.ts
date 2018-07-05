import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { TermsModalPage } from './terms-modal';

@NgModule({
  declarations: [
    TermsModalPage,
  ],
  imports: [
    IonicPageModule.forChild(TermsModalPage),
  ],
})
export class TermsModalPageModule {}
