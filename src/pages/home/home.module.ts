import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { HomePage } from './home';
import { RestaurantCardModule } from "../../components/restaurant-card/restaurant-card.module";
import { TopPickCardModule } from "../../components/top-pick-card/top-pick-card.module";

@NgModule({
  declarations: [
    HomePage,
  ],
  imports: [
    IonicPageModule.forChild(HomePage),
    RestaurantCardModule,
    TopPickCardModule
  ]
})
export class HomePageModule {}
