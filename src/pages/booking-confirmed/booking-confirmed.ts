import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';

import { FunctionsProvider } from '../../providers/functions/functions';

/**
 * Generated class for the BookingConfirmedPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@Component({
  selector: 'page-booking-confirmed',
  templateUrl: 'booking-confirmed.html',
})
export class BookingConfirmedPage {
  restaurant: any;
  booking: any;
  dateObject = {} as any;

  constructor(public navCtrl: NavController, public navParams: NavParams, private functions: FunctionsProvider) {
    this.restaurant = navParams.get('restaurant');
    this.booking = navParams.get('booking');
    this.buildDateObject();
  }

  buildDateObject(){
    var dateOrigin = new Date(this.booking.date);
    console.log(day)
    var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    var months = ['Jan.','Feb.','Mar.','Apr.','May','Jun.','Jul.','Aug.','Sep.','Oct.','Nov.','Dec.'];
    var day = days[dateOrigin.getDay()];
    var date = dateOrigin.getDate();
    var month = months[dateOrigin.getMonth()];
    console.log(day)
    console.log(date)
    console.log(month)
    this.dateObject.month = month;
    this.dateObject.date = date;
    this.dateObject.day = day;
  }

}
