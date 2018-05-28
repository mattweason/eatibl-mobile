import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { ApiServiceProvider } from "../../providers/api-service/api-service";
import { Storage } from '@ionic/storage';
import * as decode from 'jwt-decode';
import * as _ from 'underscore';
import moment from 'moment';

import { FunctionsProvider } from '../../providers/functions/functions';

/**
 * Generated class for the BookingsPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-bookings',
  templateUrl: 'bookings.html',
})
export class BookingsPage {
  user = {
    email: '',
    name: '',
    phone: '',
    type: '',
    active: 0
  };
  bookingUpcoming: any;
  bookingHistory: any;
  type = 'upcoming';

  constructor(public navCtrl: NavController, public navParams: NavParams, private API: ApiServiceProvider, private storage: Storage, private functions: FunctionsProvider) {
  }

  ngOnInit() {
  }

  ionViewDidEnter() {
    console.log('ionViewDidLoad BookingsPage');
    this.storage.get('user').then((val) => {
      if(val){
        this.user = decode(val);
        this.API.makePost('booking/user', {email: this.user.email}).subscribe(data => {
          this.filterAndSortBookings(data);
        });
      }
    });
  }

  filterAndSortBookings(data){
    var functions = this.functions;
    //Filter and sort upcoming bookings
    this.bookingUpcoming = _.filter(data, function(booking){
      var date = moment(booking.date).format('L');
      var time = functions.formatClockTime(booking.time, true);
      return moment(date+' '+time).isAfter(moment());
    });
    this.bookingUpcoming = _.sortBy(this.bookingUpcoming, function(booking){ //Sort by secondary first
      return booking.time;
    });
    this.bookingUpcoming = _.sortBy(this.bookingUpcoming, function(booking){ //Sort by primary second
      return booking.date;
    });
    //Filter and sort booking history
    this.bookingHistory = _.filter(data, function(booking){
      var date = moment(booking.date).format('L');
      var time = functions.formatClockTime(booking.time, true);
      return moment(date+' '+time).isBefore(moment());
    });
    this.bookingHistory = _.sortBy(this.bookingHistory, function(booking){ //Sort by secondary first
      return booking.time;
    });
    this.bookingHistory = _.sortBy(this.bookingHistory, function(booking){ //Sort by primary second
      return booking.date;
    });
    this.bookingHistory = this.bookingHistory.reverse(); //Reverse the order so most recent is first
  }

  signUp(){
    this.navCtrl.push('SignupPage');
  }

  login(){
    this.navCtrl.push('LoginPage');
  }

}
