import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { ApiServiceProvider } from "../../providers/api-service/api-service";

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  restaurantList = [];
  bookings = [];

  constructor(public navCtrl: NavController, private API: ApiServiceProvider) {
    this.API.makeCall('restaurant/all').subscribe(data => this.restaurantList = data);
  }
}
