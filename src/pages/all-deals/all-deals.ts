import {Component, ViewChild} from '@angular/core';
import {IonicPage, NavController, NavParams, Select} from 'ionic-angular';
import {FunctionsProvider} from "../../providers/functions/functions";
import {ActivityLoggerProvider} from "../../providers/activity-logger/activity-logger";
import moment from 'moment';
import {UserServiceProvider} from "../../providers/user-service/user-service";

/**
 * Generated class for the AllDealsPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-all-deals',
  templateUrl: 'all-deals.html',
})
export class AllDealsPage {
  @ViewChild('peopleSelect') peopleSelect: Select;

  private allTimeslots = {} as any;
  people: Number = 2;
  rowIndex: Number = 0;
  activeTimeslot: any;
  selectedDate: any;
  restaurant: any;
  businessHoursData: any;
  time: any;
  date: any;
  distance: any;

  constructor(
    public navCtrl: NavController,
    private functions: FunctionsProvider,
    private log: ActivityLoggerProvider,
    private userService: UserServiceProvider,
    public navParams: NavParams
  ) {
    this.allTimeslots = JSON.parse(this.navParams.get('allTimeslots'));
    this.restaurant = JSON.parse(this.navParams.get('restaurant'));
    this.businessHoursData = JSON.parse(this.navParams.get('businessHours'));
    this.time = this.navParams.get('time');
    this.date = this.navParams.get('date');
    this.distance = this.navParams.get('distance');
    this.people = this.navParams.get('people');
  }

  //Open people select programatically
  openPeopleSelect(){
    if(this.peopleSelect){
      this.peopleSelect.open()
    }
  }

  //Toggle day expansions
  expandWeekday(index){
    if(this.rowIndex == index)
      this.rowIndex = 8;
    else
      this.rowIndex = index;
  }

  //Activate a booking
  selectBooking(timeslot, index){

    this.log.sendEvent('Timeslot: Selected', 'Restaurant', 'User chose timeslot: '+ JSON.stringify(timeslot));
    this.activeTimeslot = timeslot;
    this.selectedDate = moment().add(index, 'days').format('MMM Do');
    this.date = moment().add(index, 'days');
  }

  //Navigate to confirm booking page
  bookNow(restaurant, timeslot, people, date){
    if(!this.userService.user.email){
      this.log.sendRestoEvent('Booking: Initiated (Not Logged In)', 'Restaurant', 'At time: '+timeslot.time+' At discount: '+timeslot.discount+ ' For party size: '+people+ ' At date: '+date+ ' At restaurant: '+restaurant.name,    this.restaurant._id);
      this.functions.presentAlert('Not Logged In', 'You must be logged in to make a booking.', 'Got It');
    }
    else{
      this.log.sendRestoEvent('Booking: Initiated', 'Restaurant', 'At time: '+timeslot.time+' At discount: '+timeslot.discount+ ' For party size: '+people+ ' At date: '+date+ ' At restaurant: '+restaurant.name,    this.restaurant._id);
      this.navCtrl.push('ConfirmBookingPage', {
        restaurant: restaurant,
        timeslot: timeslot,
        people: people,
        date: date,
        notificationData: {
          allTimeslots: this.allTimeslots,
          businessHours: this.businessHoursData,
          distance: this.distance,
          time: this.time,
          date: this.date
        }
      });
    }
  }

}
