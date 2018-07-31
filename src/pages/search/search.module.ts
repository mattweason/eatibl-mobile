import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { SearchPage } from './search';
import { RestaurantCardModule } from "../../components/restaurant-card/restaurant-card.module";
import { PipesModule } from '../../pipes/pipes.module';

@NgModule({
  declarations: [
    SearchPage
  ],
  imports: [
    IonicPageModule.forChild(SearchPage),
    RestaurantCardModule,
    PipesModule
  ]
})
export class SearchPageModule {}
