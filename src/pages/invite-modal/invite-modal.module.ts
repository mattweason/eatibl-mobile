import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { InviteModalPage } from './invite-modal';

@NgModule({
  declarations: [
    InviteModalPage,
  ],
  imports: [
    IonicPageModule.forChild(InviteModalPage),
  ],
})
export class InviteModalPageModule {}
