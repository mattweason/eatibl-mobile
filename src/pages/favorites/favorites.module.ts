import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { RestaurantCardModule } from "../../components/restaurant-card/restaurant-card.module";
import { FavoritesPage } from './favorites';

@NgModule({
  declarations: [
    FavoritesPage,
  ],
  imports: [
    IonicPageModule.forChild(FavoritesPage),
    RestaurantCardModule
  ],
})
export class FavoritesPageModule {}
