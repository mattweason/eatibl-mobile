import { NgModule } from '@angular/core';
import { IonicModule } from 'ionic-angular';
import { RestaurantCardComponent } from './restaurant-card';

@NgModule({
  declarations: [
    RestaurantCardComponent
  ],
  imports: [
    IonicModule
  ],
  exports: [
    RestaurantCardComponent
  ]
})
export class RestaurantCardModule {}
