import { Component, Input } from '@angular/core';
import { NavController } from 'ionic-angular';

import { RestaurantPage } from '../../pages/restaurant/restaurant';

/**
 * Generated class for the RestaurantComponent component.
 *
 * See https://angular.io/api/core/Component for more info on Angular
 * Components.
 */
@Component({
  selector: 'restaurant',
  templateUrl: 'restaurant.html'
})
export class RestaurantComponent {

  @Input() restaurant: any;

  text: string;

  constructor(public navCtrl: NavController) {
    console.log('Hello RestaurantComponent Component');
    this.text = 'Hello World';
  }

  navigateTo(event, id){
    console.log('restaurant');
    this.navCtrl.push(RestaurantPage, {
      id: id
    });
  }

}
