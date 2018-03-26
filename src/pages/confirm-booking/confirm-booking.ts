import { Component, OnInit } from '@angular/core';
import { IonicPage, NavController, NavParams, AlertController } from 'ionic-angular';
import { ApiServiceProvider } from "../../providers/api-service/api-service";

import { BookingConfirmedPage } from '../../pages/booking-confirmed/booking-confirmed';

import { FunctionsProvider } from '../../providers/functions/functions';

/**
 * Generated class for the ConfirmBookingPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@Component({
  selector: 'page-confirm-booking',
  templateUrl: 'confirm-booking.html',
})
export class ConfirmBookingPage {

  restaurant: any;
  timeslot: any;
  people: any;
  user = {
    name: '',
    phone: '',
    email: '',
    active: 0
  };
  dateObject = {} as any;
  date: any;
  response: any;

  constructor(public navCtrl: NavController, public navParams: NavParams, private functions: FunctionsProvider, private API: ApiServiceProvider, public alertCtrl: AlertController) {
    this.restaurant = navParams.get('restaurant');
    this.timeslot = navParams.get('timeslot');
    this.people = navParams.get('people');
    this.date = navParams.get('date');
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad ConfirmBookingPage');
  }

  ngOnInit(){
    this.buildDateObject();
  }

  buildDateObject(){
    var dateOrigin = new Date(this.date);
    var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    var months = ['Jan.','Feb.','Mar.','Apr.','May','Jun.','Jul.','Aug.','Sep.','Oct.','Nov.','Dec.'];
    var day = days[dateOrigin.getDay()];
    var date = dateOrigin.getDate();
    var month = months[dateOrigin.getMonth()];
    this.dateObject.month = month;
    this.dateObject.date = date;
    this.dateObject.day = day;
  }

  confirm(){
    var postObject = {
      user: this.user,
      people: this.people,
      timeslot: this.timeslot,
      date: this.date
    };

    this.API.makePost('booking/' + this.restaurant._id + '/create', postObject).subscribe(response => {
      var title;
      var message;
      this.response = response;

      if(this.response.message){
        if(this.response.message == 'overcapacity'){ //If requested capacity is over the available capacity
          title = 'Overcapacity';
          message = 'Sorry, but this timeslot only has '+this.response.remainder+' seats left.';
        }

        if(this.response.message == 'user exists'){ //If the email address belongs to a registered account
          title = 'Email Address Taken';
          message = 'This email address belongs to a registered account. Please login or use a different email.';
        }

        if(this.response.message == 'booking limit'){ //If the user has reached the booking limit
          title = 'Booking Limit';
          message = 'You already have 3 upcoming bookings and cannot make anymore.';
        }

        if(this.response.message == 'error'){ //If there was an error adding the user or the booking
          title = 'Error';
          message = 'Sorry, there was an error with your booking. Please try again.';
        }

        this.presentAlert(title, message);
      }
      else
        this.navCtrl.push(BookingConfirmedPage, {
          booking: this.response.booking,
          restaurant: this.restaurant
        }).then(() => {
          var index = this.navCtrl.getActive().index;
          this.navCtrl.remove(index-1);
        });
    });
  }

  cancel(){
    this.navCtrl.pop();
  }

  presentAlert(title, message){
    let alert = this.alertCtrl.create({
      title: title,
      message: message,
      buttons: ['Dismiss']
    });
    alert.present();
  }

}
