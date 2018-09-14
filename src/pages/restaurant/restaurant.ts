import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { DomSanitizer, SafeResourceUrl, SafeUrl } from '@angular/platform-browser';
import { IonicPage, NavController, NavParams, Slides, Events, Select } from 'ionic-angular';
import { DatePicker } from '@ionic-native/date-picker';
import { LaunchNavigator, LaunchNavigatorOptions } from '@ionic-native/launch-navigator';
import { ActivityLoggerProvider } from "../../providers/activity-logger/activity-logger";
import { ApiServiceProvider } from "../../providers/api-service/api-service";
import { FunctionsProvider } from '../../providers/functions/functions';
import { Storage } from '@ionic/storage';
import * as _ from 'underscore';
import moment from 'moment';
import { ENV } from '@app/env';

import { ConfirmBookingPage } from '../../pages/confirm-booking/confirm-booking';

/**
 * Generated class for the RestaurantPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-restaurant',
  templateUrl: 'restaurant.html',
})
export class RestaurantPage implements OnInit {
  private slides: Slides;
  private url: string = ENV.API;

  @ViewChild('slides') set content(content: Slides) {
    this.slides = content;
    this.setInitialPosition();
    if(this.timeslotId != '' && this.slides)
      this.setSlide();
  }
  @ViewChild('peopleSelect') peopleSelect: Select;

  timeslots: any;
  timeslotsData = {} as any;
  fillerslots = [];
  businessHours = [[],[],[],[],[],[],[]];
  businessDays = [['Monday','Mon'],['Tuesday','Tue'],['Wednesday','Wed','',''],['Thursday','Thu','',''],['Friday','Fri','',''],['Saturday','Sat','',''],['Sunday','Sun','','']];
  businessHoursData = {} as any;
  restaurant: any;
  activeTimeslot: any;
  people: Number = 2;
  open: any;
  restaurantId: String;
  timeslotId: String;
  type: String;
  date: any;
  time: any;
  today: string;
  maxDate: string;
  isLoaded: boolean = false;
  scrollingSlides: any;
  isBeginning: boolean = false;
  isEnd: boolean = false;
  featuredImageUrl: any;
  orderedImgArray = []; //for displaying the image slides in the right order
  location: any;
  distance: any;

  mapUrl: string;

  constructor(
    public navCtrl: NavController,

    public navParams: NavParams,
    private API: ApiServiceProvider,
    private datePicker: DatePicker,
    private functions: FunctionsProvider,
    private sanitizer: DomSanitizer,
    private launchNavigator: LaunchNavigator,
    public events: Events,
    private log: ActivityLoggerProvider,
    private storage: Storage
  ) {

    this.restaurant = JSON.parse(navParams.get('restaurant'));
    this.timeslotsData = JSON.parse(navParams.get('timeslotsData'));
    this.businessHoursData = JSON.parse(navParams.get('businessHoursData'));
    this.timeslotId = navParams.get('timeslotId');
    this.distance = this.functions.roundDistances(navParams.get('distance'));
    this.date = navParams.get('date');
    this.time = navParams.get('time');

  //Since we aren't doing setnow, make sure to initialize
    this.today = moment().format();
    this.maxDate = moment().add(30, 'day').format();
    //Subscribe to geolocation event
    events.subscribe('user:geolocated', (location, time) => {
        this.location = location;
        this.setDistance();
    });

    this.storage.get('eatiblLocation').then((val) => { //If so get the new location and get new ranked list of restaurants
      if (val){
        this.location = val;
        this.setDistance();
      }
    });

    this.processBusinessHours();
    this.processTimeslots();
    this.isOpen();
    this.buildMap();

    this.API.makePost('booking/specific', {restaurantId: this.restaurant._id, date: this.date}).subscribe(response => {
      var bookings: any = response;

      //Loop through all of our booking for this day, at this restaurant
      for(var i = 0; i < bookings.length; i++){
        //find the index of the timeslot that needs to be reduced becaused of current booking
        var index = _.findIndex(this.timeslots, function(timeslot){
          return timeslot._id == bookings[i].timeslot_fid;
        });

        //reduce capacity by the number already taken in booking
        if(index >= 0)
          this.timeslots[index].quantity -= bookings[i].people;
      }
      this.processTimeslots();
    });

    if(!this.restaurant.recommendedItems) //Until all restaurants have at least an empty recommendItems property
      this.restaurant.recommendedItems = [];

    if(this.restaurant.featuredImage){
      //reorder the image array to put featured image first
      var index = this.restaurant.images.indexOf(this.restaurant.featuredImage);
      if(index > -1)
        this.restaurant.images.splice(index,1); //remove from image list

      this.restaurant.images.unshift(this.restaurant.featuredImage); //add featured image to start of list

      for(var i = 0; i < this.restaurant.images.length; i++){
        var imageUrl = this.url+'files/'+this.restaurant.images[i];
        this.orderedImgArray.push(this.sanitizer.bypassSecurityTrustStyle(`url(${imageUrl})`));
      }
    }
  }

  ionViewDidLoad() {
    this.type = "about";
    //Call geolocation from app.component
    this.events.publish('get:geolocation', Date.now());
  }

  ngOnInit(){
  }

  //To establish open now or closed in view
  isOpen(){
    var date = new Date(this.date);

    //For finding index of businessHours today
    var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    var day = date.getDay();

    //Get current time to compare to open close hours for day
    var hour = date.getHours() >= 6 ? date.getHours() : +date.getHours + 24;
    var minute = (date.getMinutes() / 60);
    var time = hour + minute;
    var index = _.findIndex(this.businessDays, function(businessDay){
      return businessDay[0] == days[day];
    });
    var hoursLength = this.businessHours[index].length;
    var openStatus = '';

    if(hoursLength == 0)
      openStatus = 'closedToday';

    //Compare current time to open close hours and set to this.open
    if(hoursLength == 2){
      if(this.businessHours[index][0] == this.businessHours[index][1])
        openStatus = 'closedToday';
      else{
        if(time >= this.businessHours[index][0] && time < this.businessHours[index][1]) //During business hours
          openStatus = 'open';
        if(time >= this.businessHours[index][1])//After closed
          openStatus = 'closed';
        if(time < this.businessHours[index][0]) //Before open
          openStatus = 'willOpen';
      }
    }
    if(hoursLength == 4){
      if((time >= this.businessHours[index][0] && time < this.businessHours[index][1]) || (time >= this.businessHours[index][2] && time < this.businessHours[index][3])) //During bussines hours
        openStatus = 'open';
      if(time >= this.businessHours[index][3]) //After second closed
        openStatus = 'closed';
      if((time <= this.businessHours[index][2] && time > this.businessHours[index][1]) || time < this.businessHours[index][0]) //Before first or second open, but after first closed
        openStatus = 'willOpen';
    }

    this.open = {
      open: openStatus,
      index: index
    }
  }

  //Build static map url
  buildMap(){
    // this.mapUrl = "https://maps.googleapis.com/maps/api/staticmap?size=600x340&maptype=roadmap&markers=color:blue%7Clabel:S%7C40.702147,-74.015794&key=AIzaSyD3lkVR2f_hCqSF_7Zpj4kUIAwlqLf1uao"
    this.mapUrl = "https://maps.googleapis.com/maps/api/staticmap?zoom=15&size=600x340&maptype=roadmap&markers=icon:https://eatibl.com/assets/images/eatibl-pin.png|"+this.restaurant.latitude+","+this.restaurant.longitude+"&key=AIzaSyAr99dcWf_ri92qrY7ZmcI54Uv0oaGXd2w";
  }

  //Open the users relevant maps app to navigate to the restaurant
  openMaps(){
    this.log.sendEvent('Get Directions', 'Restaurant', 'User clicked on the navigate button below the map');
    this.launchNavigator.navigate(this.restaurant.address);
  }

  //Open people select programatically
  openPeopleSelect(){
    if(this.peopleSelect){
      this.peopleSelect.open()
    }
  }

  //Filter timeslots for the currently selected date
  processTimeslots(){
    var hour = (parseInt(moment().format('k')) + (parseInt(moment().format('m')) / 60));
    var date = this.date;

    //Filter timeslots by date and time
    this.timeslots = _.filter(this.timeslotsData, function(timeslot){
      if(moment(date).isSame(moment(), 'day'))
        return (timeslot.day == moment(date).format('dddd').toString() && timeslot.time > hour + 0.25); //Add a quarter hour to comparison to prevent bookings within 15 minutes of a booking time
      else
        return (timeslot.day == moment(date).format('dddd').toString());
    });

    //For finding index of businessHours today
    var dateNow = new Date(this.date);
    var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    var day = dateNow.getDay();
    var index = _.findIndex(this.businessDays, function(businessDay){
      return businessDay[0] == days[day];
    });

    //Filter out timeslots that exist outside of business hours
    var current = this; //Cache this for use in filter
    this.timeslots = _.filter(this.timeslots, function(timeslot){
      if(current.businessHours[index].length == 2){
        return timeslot.time >= current.businessHours[index][0] && timeslot.time < current.businessHours[index][1];
      }
      if(current.businessHours[index].length == 4){
        return (timeslot.time >= current.businessHours[index][0] && timeslot.time < current.businessHours[index][1]) || (timeslot.time >= current.businessHours[index][2] && timeslot.time < current.businessHours[index][3]);
      }
    });

    this.timeslots = _.sortBy(this.timeslots, 'time');

    this.isLoaded = true;

    //Activate timeslot on load if one exists
    if(this.timeslotId != ''){
      var timeslotId = this.timeslotId; //Avoid this scoping issues in filter
      var timeslotExists = false; //Set to true if timeslotid is found in list

      //Check if selected timeslot still exists (may not if time has passed)
      for(var i = 0; i < this.timeslots.length; i++){
        if(timeslotId == this.timeslots[i]._id)
          timeslotExists = true;
      }

      //Select the booking the user clicked from the restaurant card
      if(timeslotExists){ //selectBooking will crash if timeslot doesn't exist
        var timeslot = _.filter(this.timeslots, function(timeslot){
          return timeslot._id == timeslotId;
        });
        this.selectBooking(timeslot[0]);
      }
      else{
        this.timeslotId = '';
      }
    }

    //Build filler timeslots
    if(this.timeslots.length < 4 && this.timeslots.length > 0){
      var filler = 4 - this.timeslots.length;
      for(var i = 0; i < filler; i++){
        this.fillerslots.push('filler');
      }
    }
  }

  //Activate a booking
  selectBooking(timeslot){
    this.log.sendEvent('Timeslot: Selected', 'Restaurant', 'User chose timeslot: '+ JSON.stringify(timeslot));
    this.activeTimeslot = timeslot;
  }

  //Add open and close hours to businessHours array for ngFor loop in view
  processBusinessHours(){
    for (var i = 0; i < this.businessHoursData.length; i++)
      for(var a = 0; a < this.businessHours.length; a++){
        if(this.businessDays[a][0] == this.businessHoursData[i]['day']){
          this.businessHours[a] = this.businessHoursData[i]['hours'];
        }
      }
  }

  //When time changes or date changes, set slide to selected time
  setSlideToTime(){
    if(this.slides){
      //time value formatted as 24hr integer
      var time = moment(this.time).get('hour') + (moment(this.time).get('minute') / 60);

      var index = _.findIndex(this.timeslots, function(timeslot){
        return timeslot.time == time;
      });

      //if we can't find that particular timeslot, search for nearby timeslots to shift to
      if(index == -1){
        var timeslotArray = [];
        timeslotArray = _.pluck(this.timeslots, 'time'); //grab all the times
        for (var i = 0; i < timeslotArray.length; i++){
          //find the first timeslot that goes past the selected time
          if (timeslotArray[i] > time && index == -1){
            index = _.findIndex(this.timeslots, function(timeslot){
              return timeslot.time == timeslotArray[i];
            });
          }
        }
      }
      if(index == -1)
        this.slides.slideTo(this.timeslots.length);
      else
        this.slides.slideTo(index - 1)
    }
  }

  //Move slider to the active timeslot
  setSlide(){
    var activeTimeslot = this.activeTimeslot;
    var index = _.findIndex(this.timeslots, function(timeslot){
      return timeslot._id == activeTimeslot._id;
    });
    setTimeout(() => {
      this.slides.slideTo(index - 1)
    }, 500);
  }

  nextSlide(){
    this.log.sendEvent('Timeslot: Next Slide', 'Restaurant', '');
    if(this.slides)
      if(!this.slides.isEnd())
        this.slides.slideNext();
  }

  prevSlide(){
    this.log.sendEvent('Timeslot: Previous Slide', 'Restaurant', '');
    if(this.slides)
      if(!this.slides.isBeginning())
        this.slides.slidePrev();
  }

  //Run and receives response from press-hold directive
  scrollSlides(response, direction){
    if(response == 'press'){
      this.scrollingSlides = setInterval(() => {
        if(direction == 'prev')
          this.prevSlide();
        if(direction == 'next')
          this.nextSlide();
      }, 100)
    }
    if(response == 'pressup'){
      clearInterval(this.scrollingSlides);
    }
  }

  //Set whether the slide is at the end or the beginning on initial load
  setInitialPosition(){
    if(this.slides)
      setTimeout(() => {
        this.isBeginning = this.slides.isBeginning();
        this.isEnd = this.slides.isEnd();
      }, 500);
  }

  //Set whether the slide is at the end or beginning
  slidePosition(){
    if(this.slides){
      this.isBeginning = this.slides.isBeginning();
      this.isEnd = this.slides.isEnd();
    }
  }

  //Navigate to confirm booking page
  bookNow(event, restaurant, timeslot, people, date){
    this.log.sendEvent('Booking: Initiated', 'Restaurant', 'At time: '+timeslot.time+' At discount: '+timeslot.discount+ ' For party size: '+people+ ' At date: '+date+ ' At restaurant: '+restaurant.name);
    this.navCtrl.push('ConfirmBookingPage', {
      restaurant: restaurant,
      timeslot: timeslot,
      people: people,
      date: date
    });
  }

  setNow(initialCall){
    if(this.date != this.today || initialCall){
      this.date = this.today = moment().format();
      this.maxDate = moment().add(30, 'day').format();
    }
    this.time = moment().add(30 - moment().minute() % 30, 'm').format();
  }

  //Determine and set distance in km from restaurant to user location
  setDistance(){
    //Get distance only if coordinates are available
    if(this.location && this.restaurant.latitude && this.restaurant.longitude){
      var distance = this.functions.getDistanceFromLatLonInKm(this.location[0], this.location[1], this.restaurant.latitude, this.restaurant.longitude);
      this.distance = this.functions.roundDistances(distance);
    }
  }

  //Keep track of when people are adjust date values
  logDate(action, data){
    if(action == 'changed')
      this.log.sendEvent('DatePicker: Updated', 'Restaurant', JSON.stringify(data));
    if(action =='cancelled')
      this.log.sendEvent('DatePicker: Cancelled', 'Restaurant', JSON.stringify(data));
  }

  //Keep track of when people are adjust time values
  logTime(action, data){
    if(action == 'changed')
      this.log.sendEvent('TimePicker: Updated', 'Restaurant', JSON.stringify(data));
    if(action =='cancelled')
      this.log.sendEvent('TimePicker: Cancelled', 'Restaurant', JSON.stringify(data));
  }
}
