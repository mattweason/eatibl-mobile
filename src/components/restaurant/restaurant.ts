import { Component, Input, OnInit, OnChanges, SimpleChange } from '@angular/core';
import { NavController } from 'ionic-angular';
import { ApiServiceProvider } from "../../providers/api-service/api-service";
import * as _ from 'underscore'
import * as moment from 'moment'
import { FunctionsProvider } from '../../providers/functions/functions';

import { RestaurantPage } from '../../pages/restaurant/restaurant';

/**
 * Generated class for the RestaurantComponent component.
 *
 * See https://angular.io/api/core/Component for more info on Angular
 * Components.
 */
@Component({
  selector: 'restaurant',
  templateUrl: 'restaurant.html'
})
export class RestaurantComponent implements OnChanges {

  @Input() restaurant = {} as any;
  @Input() date: string;

  ngOnChanges(changes: {[propKey: string]: SimpleChange}) {
    console.log('changed')
    this.processBusinessHours();
    this.processTimeslots();
  }

  timeslots: any;
  timeslotsData = {} as any;
  businessHours = [];
  businessHoursData = {} as any;
  open: any;
  isLoaded: boolean = false;

  constructor(public navCtrl: NavController, private API: ApiServiceProvider, private functions: FunctionsProvider) {
  }

  ngOnInit(){
    this.API.makeCall('discount/' + this.restaurant._id + '/week').subscribe(data => {
      this.timeslotsData = data;
      this.processTimeslots()
    });
    this.API.makeCall('hours/' + this.restaurant._id).subscribe(data => {
      this.businessHoursData = data;
      this.processBusinessHours()
    });
  }


  navigateTo(event, restaurantId, timeslotId){
    this.navCtrl.push(RestaurantPage, {
      restaurantId: restaurantId,
      timeslotId: timeslotId
    });
  }

  //To establish open now or closed in view
  isOpen(){
    //Get current time to compare to open close hours for day
    var time = this.functions.formatTime(this.date);

    //Compare current time to open close hours and set to this.open
    this.open = this.businessHours[0] <= time && this.businessHours[1] >= time;
  }

  //Filter timeslots for the currently selected date
  processTimeslots(){
    var hour = (parseInt(moment().format('k')) + (parseInt(moment().format('m')) / 60));
    var date = this.date;

    //Filter timeslots by date and time
    this.timeslots = _.filter(this.timeslotsData, function(timeslot){
      if(moment(date).isSame(moment(), 'day'))
        return (timeslot.day == moment().format('dddd').toString() && timeslot.time > hour);
      else
        return (timeslot.day == moment().format('dddd').toString());
    });

    this.isLoaded = true;
  }

  //Add open and close hours to businessHours array for ngFor loop in view
  processBusinessHours(){
    for (var i = 0; i < this.businessHoursData.length; i++)
      if(this.businessHoursData[i]['day'] == moment(this.date).format('dddd').toString()){
        this.businessHours[0] = this.businessHoursData[i]['open'];
        this.businessHours[1] = this.businessHoursData[i]['close'];
      }
    this.isOpen();
  }
}
