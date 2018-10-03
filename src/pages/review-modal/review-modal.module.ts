import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { ReviewModalPage } from './review-modal';

@NgModule({
  declarations: [
    ReviewModalPage,
  ],
  imports: [
    IonicPageModule.forChild(ReviewModalPage),
  ],
})
export class ReviewModalPageModule {}
