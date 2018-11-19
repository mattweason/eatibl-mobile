import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { AllDealsPage } from './all-deals';

@NgModule({
  declarations: [
    AllDealsPage,
  ],
  imports: [
    IonicPageModule.forChild(AllDealsPage),
  ],
})
export class AllDealsPageModule {}
