import { Component, ViewChild } from '@angular/core';
import { IonicPage, NavController, NavParams, Content } from 'ionic-angular';
import { ApiServiceProvider } from "../../providers/api-service/api-service";
import * as _ from 'underscore';
import moment from 'moment';

import { FunctionsProvider } from '../../providers/functions/functions';
import {UserServiceProvider} from "../../providers/user-service/user-service";

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
  @ViewChild(Content) content: Content;

  user = {} as any;
  bookingUpcoming = [] as any;
  bookingHistory = [] as any;
  type = 'upcoming';

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private API: ApiServiceProvider,
    private functions: FunctionsProvider,
    private userService: UserServiceProvider
  ) {
  }

  ngOnInit() {
  }

  ionViewDidEnter() {
    this.user = this.userService.user;
    if(this.user.email){
      this.API.makePost('booking/user', {email: this.user.email}).subscribe(data => {
        this.filterAndSortBookings(data);
      });
    } else {
      this.user = {}; //If no user exists in the localstorage, clear the user object
      this.bookingUpcoming = [];
      this.bookingHistory = [];
      this.content.resize(); //Handle the show/hide behavior of the tabs toolbar
    }
  }

  filterAndSortBookings(data){
    var functions = this.functions;
    //Filter and sort upcoming bookings
    this.bookingUpcoming = _.filter(data, function(booking){
      var date = moment(booking.date).format('L');
      var time = functions.formatClockTime(booking.time, true);
      return moment(date+' '+time).add(1, 'h').isAfter(moment());
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
      return moment(date+' '+time).add(1, 'h').isBefore(moment());
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
