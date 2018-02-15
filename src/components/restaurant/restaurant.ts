import { Component, Input, OnInit } from '@angular/core';
import { NavController } from 'ionic-angular';
import { ApiServiceProvider } from "../../providers/api-service/api-service";
import * as _ from 'underscore'
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
export class RestaurantComponent {

  @Input() restaurant: any;

  timeslots: any;
  businessHours = [['Monday','Mon','',''],['Tuesday','Tue','',''],['Wednesday','Wed','',''],['Thursday','Thu','',''],['Friday','Fri','',''],['Saturday','Sat','',''],['Sunday','Sun','','']];
  open: any;
  isLoaded: boolean = false;

  constructor(public navCtrl: NavController, private API: ApiServiceProvider, private functions: FunctionsProvider) {
  }

  ngOnInit(){
    this.API.makeCall('discount/' + this.restaurant._id + '/week').subscribe(data => this.processTimeslots(data));
    this.API.makeCall('hours/' + this.restaurant._id).subscribe(data => this.processBusinessHours(data));
  }

  navigateTo(event, restaurantId, timeslotId){
    this.navCtrl.push(RestaurantPage, {
      restaurantId: restaurantId,
      timeslotId: timeslotId
    });
  }

  //To establish open now or closed in view
  buildTodayDate(){
    var date = new Date(Date.now());

    //For finding index of businessHours today
    var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    var day = date.getDay();

    //Get current time to compare to open close hours for day
    var hour = date.getHours() >= 6 ? date.getHours() : +date.getHours + 24;
    var minute = (date.getMinutes() / 60);
    var time = hour + minute;
    var index = _.findIndex(this.businessHours, function(businessDay){
      return businessDay[0] == days[day];
    });

    //Converting open and close hours from string to numbers
    var open: Number = +this.businessHours[index][2];
    var close: Number = +this.businessHours[index][3];

    //Compare current time to open close hours
    var isOpen = open <= time && close >= time;

    this.open = {
      open: isOpen,
      index: index
    }
  }

  //Filter timeslots for the currently selected date
  processTimeslots(data){
    //Process date used to filter timeslots
    var date = new Date(Date.now());
    var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    var day = days[date.getDay()];

    this.timeslots = _.filter(data, function(timeslot){
      return timeslot.day == day;
    });

    this.isLoaded = true;
  }

  //Add open and close hours to businessHours array for ngFor loop in view
  processBusinessHours(data){
    console.log(data)
    for (var i = 0; i < data.length; i++)
      for(var a = 0; a < this.businessHours.length; a++)
        if(this.businessHours[a][0] == data[i]['day']){
          this.businessHours[a][2] = data[i]['open'];
          this.businessHours[a][3] = data[i]['close'];
        }
    this.buildTodayDate();
  }
}
