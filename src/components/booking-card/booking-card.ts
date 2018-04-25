import { Component, Input } from '@angular/core';
import { NavController } from 'ionic-angular';

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

  constructor(public navCtrl: NavController, private functions: FunctionsProvider) {
  }

  ngOnInit(){
    this.buildDateObject();
  }

  buildDateObject(){
    var dateOrigin = new Date(this.booking.date);
    var days = ['Sun.','Mon.','Tues.','Wed.','Thurs.','Fri.','Sat.'];
    var months = ['Jan.','Feb.','March','April','May','June','July','Aug.','Sept.','Oct.','Nov.','Dec.'];
    var day = days[dateOrigin.getDay()];
    var date = dateOrigin.getDate();
    var month = months[dateOrigin.getMonth()];
    this.dateObject.month = month;
    this.dateObject.date = date;
    this.dateObject.day = day;
  }

  viewBooking(){
    this.navCtrl.push('BookingConfirmedPage', {
      booking: this.booking,
      restaurant: this.booking.restaurant_fid //Contains all restaurant information
    });
  }

}
