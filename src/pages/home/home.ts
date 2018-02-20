import { Component } from '@angular/core';
import { NavController, PopoverController } from 'ionic-angular';
import { ApiServiceProvider } from "../../providers/api-service/api-service";
import { DatePicker } from '@ionic-native/date-picker';
import * as moment from 'moment'

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  restaurantList = [];
  bookings = [];
  date: string;
  today: string;
  maxDate: string;

  constructor(public navCtrl: NavController, private API: ApiServiceProvider, public popoverCtrl: PopoverController) {
    this.API.makeCall('restaurant/all').subscribe(data => this.restaurantList = data);
    this.date = this.today = moment().toISOString();
    this.maxDate = moment(this.today).add(1, 'month').toISOString();
  }

  changeDate(){
    console.log(this.date);
  }
}
