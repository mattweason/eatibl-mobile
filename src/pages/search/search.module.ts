import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { SearchPage } from './search';
import { RestaurantCardModule } from "../../components/restaurant-card/restaurant-card.module"

@NgModule({
  declarations: [
    SearchPage,
  ],
  imports: [
    IonicPageModule.forChild(SearchPage),
    RestaurantCardModule
  ]
})
export class SearchPageModule {}
