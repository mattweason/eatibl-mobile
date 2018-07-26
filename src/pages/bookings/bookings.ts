import { Component, ViewChild } from '@angular/core';
import { IonicPage, NavController, NavParams, Content } from 'ionic-angular';
import { ApiServiceProvider } from "../../providers/api-service/api-service";
import { ActivityLoggerProvider } from "../../providers/activity-logger/activity-logger";
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
  @ViewChild(Content) content: Content;

  user = {} as any;
  bookingUpcoming = [] as any;
  bookingHistory = [] as any;
  type = 'upcoming';

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private API: ApiServiceProvider,
    private storage: Storage,
    private functions: FunctionsProvider,
    private log: ActivityLoggerProvider
  ) {
  }

  ngOnInit() {
  }

  ionViewDidEnter() {
    this.storage.get('eatiblUser').then((val) => {
      if(val){
        this.user = decode(val);
        this.content.resize(); //Handle the show/hide behavior of the tabs toolbar
        this.API.makePost('booking/user', {email: this.user.email}).subscribe(data => {
          this.filterAndSortBookings(data);
        });
      }
      else{
        this.user = {}; //If not user exists in the localstorage, clear the user object
        this.content.resize(); //Handle the show/hide behavior of the tabs toolbar
      }
    });
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
