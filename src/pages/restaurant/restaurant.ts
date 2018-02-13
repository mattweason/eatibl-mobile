import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { ApiServiceProvider } from "../../providers/api-service/api-service";

/**
 * Generated class for the RestaurantPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-restaurant',
  templateUrl: 'restaurant.html',
})
export class RestaurantPage {

  restaurant: any;
  timeslots: any;

  constructor(public navCtrl: NavController, public navParams: NavParams, private API: ApiServiceProvider) {
    let id = navParams.get('id');
    this.API.makeCall('restaurant/' + id).subscribe(data => this.restaurant = data);
    this.API.makeCall('discount/' + id + '/week').subscribe(data => this.timeslots = data);
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad RestaurantPage');
  }

}
