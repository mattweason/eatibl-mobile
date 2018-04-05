import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, AlertController } from 'ionic-angular';
import { ApiServiceProvider } from "../../providers/api-service/api-service";

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
  response: any;

  constructor(public navCtrl: NavController, public navParams: NavParams, private functions: FunctionsProvider, private API: ApiServiceProvider, public alertCtrl: AlertController) {
    this.restaurant = navParams.get('restaurant');
    this.booking = navParams.get('booking');
    this.buildDateObject();
  }

  buildDateObject(){
    var dateOrigin = new Date(this.booking.date);
    var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    var months = ['Jan.','Feb.','Mar.','Apr.','May','Jun.','Jul.','Aug.','Sep.','Oct.','Nov.','Dec.'];
    var day = days[dateOrigin.getDay()];
    var date = dateOrigin.getDate();
    var month = months[dateOrigin.getMonth()];
    this.dateObject.month = month;
    this.dateObject.date = date;
    this.dateObject.day = day;
  }

  cancelBooking(){
    let alert = this.alertCtrl.create({
      title: 'Cancel Booking',
      message: 'Are you sure you want to cancel this booking?',
      buttons: [
        {
          text: 'No',
          role: 'cancel',
          handler: () => {
            console.log('Cancel clicked');
          }
        },
        {
          text: 'Yes',
          handler: () => {
            this.API.makeCall('booking/'+this.booking._id+'/disable').subscribe(response => {
              this.response = response;
              if(this.response.message == 'error')
                this.errorAlert();
              if(this.response.disabled == 1)
                this.successAlert();
            });
          }
        }
      ]
    });
    alert.present();
  }

  errorAlert(){
    let alert = this.alertCtrl.create({
      title: 'Error',
      subTitle: 'Sorry, there was an error cancelling your booking. Please try again.',
      buttons: ['Dismiss']
    });
    alert.present();
  }

  successAlert(){
    let alert = this.alertCtrl.create({
      title: 'Booking Cancelled',
      subTitle: 'Your booking at '+this.restaurant.name+' was successfully cancelled.',
      buttons: [{
        text: 'Dismiss',
        handler: () => {
          this.navCtrl.pop();
        }
      }]
    });
    alert.present();
  }

}
