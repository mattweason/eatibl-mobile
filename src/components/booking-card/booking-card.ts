import { Component, Input } from '@angular/core';
import { NavController } from 'ionic-angular';
import * as moment from 'moment';

import { FunctionsProvider } from '../../providers/functions/functions';

/**
 * Generated class for the BookingCardComponent component.
 *
 * See https://angular.io/api/core/Component for more info on Angular
 * Components.
 */
@Component({
  selector: 'booking-card',
  templateUrl: 'booking-card.html'
})
export class BookingCardComponent {

  dateObject = {} as any;

  @Input() booking = {} as any;
  newBooking = false;

  constructor(public navCtrl: NavController, private functions: FunctionsProvider) {
  }

  ngOnInit(){
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

    //Check if booking is new
    var timePlus = moment(this.booking['created_at']).add(5, 'm');
    if(moment(timePlus).isAfter(moment()))
      this.newBooking = true;
  }

  viewBooking(){
    this.navCtrl.push('BookingConfirmedPage', {
      booking: this.booking,
      restaurant: this.booking.restaurant_fid //Contains all restaurant information
    });
  }

}
