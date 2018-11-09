import { Component, Input, OnChanges, SimpleChange } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import {NavController, Events} from 'ionic-angular';
import * as _ from 'underscore';
import * as moment from 'moment';
import { FunctionsProvider } from '../../providers/functions/functions';
import { ActivityLoggerProvider } from "../../providers/activity-logger/activity-logger";
import { ENV } from '@app/env';


/**
 * Generated class for the RestaurantComponent component.
 *
 * See https://angular.io/api/core/Component for more info on Angular
 * Components.
 */
@Component({
  selector: 'restaurant-card',
  templateUrl: 'restaurant-card.html'
})
export class RestaurantCardComponent implements OnChanges {
  private isVisible = false;
  private url: string = ENV.API;

  @Input() location = {} as any;
  @Input() restaurant = {} as any;
  @Input() date: string;
  @Input() time: string;
  @Input() cardType: string;
  @Input() index: number;
  @Input() locationText: string;
  @Input() user = {} as any;

  ngOnChanges(changes: {[propKey: string]: SimpleChange}) {
    if(changes.hasOwnProperty('location'))
      this.setDistance();
    if(changes.hasOwnProperty('restaurant') || changes.hasOwnProperty('date') || changes.hasOwnProperty('time')){
      this.processBusinessHours();
      this.processTimeslots();
    }
    if(changes.hasOwnProperty('user'))
      this.checkUser();
  }

  timeslots: any;
  isLoaded: boolean = true;
  timeslotsData = {} as any;
  businessHours = [];
  businessHoursData = {} as any;
  featuredImageUrl: any;
  restaurantTapped = false;
  distance: any;
  countdownIndex = 1; //Index of card we want countdown to appear under
  countdown = {} as any;
  interval: any;
  ratingStars = [] as any;
  timeslotButtons = [] as any;

  constructor(
    public navCtrl: NavController,
    private functions: FunctionsProvider,
    private sanitizer: DomSanitizer,
    private log: ActivityLoggerProvider,
    public events: Events
  ) {

    //Sends the users location to a child component when requested
    events.subscribe('loaded:restaurant', () => {
      this.processBusinessHours(); //Update business hours to latest when this view is entered
      this.processTimeslots(); //Update timeslots to latest when this view is entered
      this.processRating(); //Update ratings to latest when this view is entered
    });
  }

  ngAfterViewInit(){
    this.checkUser();
    setTimeout(() => {
      this.isLoaded = true;
      setTimeout(() => {
        this.isVisible = true;
      });
    });
  }

  checkUser(){
    if(this.user)
      if(this.user.email){ //Determine if we should show the countdown
        var start = moment(this.user['created_at']),
          end = start.add(3, 'days'),
          isNew = moment().isBefore(end);
        if(isNew && !this.user['earlySupporter'] && !this.user['hours'])
          this.runCountdown(end);
        else
          this.clearCountdown();
      }
  }

  runCountdown(end){
    var self = this;
    this.interval = setInterval(function() {
      var difference = parseInt(end.format('X')) - parseInt(moment().format('X'));

      self.countdown['hours'] = Math.floor(difference / 3600);
      self.countdown['minutes'] = Math.floor(difference % 3600 / 60);
      self.countdown['seconds'] = Math.floor(difference % 60);
      if(self.countdown['seconds'] < 10)
        self.countdown['seconds'] = '0' + self.countdown['seconds'];
      if(self.countdown['minutes'] < 10)
        self.countdown['minutes'] = '0' + self.countdown['minutes'];

      if(difference <= 0) {
        clearInterval(self.interval);
        self.countdown = {};
      }
    }, 1000);
  }

  clearCountdown(){
    clearInterval(this.interval);
    this.countdown = {};
  }

  ngOnInit(){
    //Get business hours
    this.businessHoursData = this.restaurant.businessHours;
    this.processBusinessHours();

    //Get timeslots
    this.timeslotsData = this.restaurant.timeslots;
    this.processTimeslots();

    this.processRating();

    //If there is a featured image
    if(this.restaurant.featuredImage){
      var imageUrl = 'https://eatibl.com/'+'files/'+this.restaurant.featuredImage; //TODO: Change back to this.url
      this.featuredImageUrl = this.sanitizer.bypassSecurityTrustStyle(`url(${imageUrl})`);
    }
  }

  navigateTo(target){
    setTimeout(() => {
      this.log.sendRestoEvent('Restaurant Card Clicked', 'Restaurant Card', 'User clicked on '+target, this.restaurant._id);
      this.restaurantTapped = true;
      this.navCtrl.push('RestaurantPage', {
        restaurant: JSON.stringify(this.restaurant),
        timeslotsData: JSON.stringify(this.timeslotsData),
        businessHoursData: JSON.stringify(this.businessHoursData),
        timeslotId: '',
        distance: this.distance,
        date: this.date,
        time: this.time
      }).then(() => {
        this.restaurantTapped = false;
      });
    }, 0)
  }

  //Process rating to get rating star layout
  processRating(){
    var rating = this.restaurant.rating.ratingNumber;
    for(var i = 0; i < 5; i++){
      if(rating - 1 >= 0){
        this.ratingStars[i] = 'star';
        rating -= 1;
      } else if(rating >= 0.25) {
        this.ratingStars[i] = 'star-half';
        rating = 0;
      } else if(rating < 0.25)
        this.ratingStars[i] = 'star-outline';
    }
  }

  //Add open and close hours to businessHours array for ngFor loop in view
  processBusinessHours(){
    for (var i = 0; i < this.businessHoursData.length; i++)
      if(this.businessHoursData[i]['day'] == moment(this.date).format('dddd').toString()){
        this.businessHours = this.businessHoursData[i]['hours'];
      }
  }

  //Filter timeslots for the currently selected date
  processTimeslots(){
    var hour = (parseInt(moment().format('k')) + (parseInt(moment().format('m')) / 60)); //Current time
    var date = this.date;

    //Filter timeslots by date and time
    this.timeslots = _.filter(this.timeslotsData, function(timeslot){
      if(moment(date).isSame(moment(), 'day'))
        return (timeslot.day == moment(date).format('dddd').toString() && timeslot.time > hour);
      else
        return (timeslot.day == moment(date).format('ddd' +
          'd').toString());
    });

    //Filter out timeslots that exist outside of business hours
    var current = this; //Cache this for use in filter
    this.timeslots = _.filter(this.timeslots, function(timeslot){
      if(current.businessHours.length == 2){
        return timeslot.time >= current.businessHours[0] && timeslot.time < current.businessHours[1];
      }
      if(current.businessHours.length == 4){
        return (timeslot.time >= current.businessHours[0] && timeslot.time < current.businessHours[1]) || (timeslot.time >= current.businessHours[2] && timeslot.time < current.businessHours[3]);
      }
    });

    this.timeslots = _.sortBy(this.timeslots, 'time');
    //Build timeslot buttons
    for(var i = 0; i < 3; i++){
      if(this.timeslots[i])
        this.timeslotButtons[i] = this.timeslots[i];
      else
        this.timeslotButtons[i] = '';
    }
  }

  //Determine and set distance in km from restaurant to user location
  setDistance(){
    //Get distance only if coordinates are available
    if(this.location && this.restaurant.latitude && this.restaurant.longitude){
      var distance = this.functions.getDistanceFromLatLonInKm(this.location[0], this.location[1], this.restaurant.latitude, this.restaurant.longitude);
      this.distance = this.functions.roundDistances(distance);
    }
  }
}
