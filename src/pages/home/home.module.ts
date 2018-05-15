import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { HomePage } from './home';
import { RestaurantCardModule } from "../../components/restaurant-card/restaurant-card.module";

@NgModule({
  declarations: [
    HomePage,
  ],
  imports: [
    IonicPageModule.forChild(HomePage),
    RestaurantCardModule
  ]
})
export class HomePageModule {}
