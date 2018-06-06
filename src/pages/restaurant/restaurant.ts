import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { DomSanitizer, SafeResourceUrl, SafeUrl } from '@angular/platform-browser';
import { IonicPage, NavController, NavParams, Slides, Events } from 'ionic-angular';
import { DatePicker } from '@ionic-native/date-picker';
import { LaunchNavigator, LaunchNavigatorOptions } from '@ionic-native/launch-navigator';
import { ApiServiceProvider } from "../../providers/api-service/api-service";
import { FunctionsProvider } from '../../providers/functions/functions';
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
    public events: Events) {
      this.restaurant = JSON.parse(navParams.get('restaurant'));
      this.timeslotsData = JSON.parse(navParams.get('timeslotsData'));
      this.businessHoursData = JSON.parse(navParams.get('businessHoursData'));
      this.timeslotId = navParams.get('timeslotId');
      this.distance = navParams.get('distance');
      this.date = navParams.get('date');
      this.setNow();
      //Subscribe to geolocation event
      events.subscribe('user:geolocated', (location, time) => {
        if(location)
          this.location = location;
      });
      this.setDistance();
      this.processTimeslots();
      this.processBusinessHours();
      this.isOpen();
      this.buildMap();

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
      if(time >= this.businessHours[index][0] && time < this.businessHours[index][1]) //During business hours
        openStatus = 'open';
      if(time >= this.businessHours[index][1])//After closed
        openStatus = 'closed';
      if(time < this.businessHours[index][0]) //Before open
        openStatus = 'willOpen';
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
    this.mapUrl = "https://maps.googleapis.com/maps/api/staticmap?size=600x340&maptype=roadmap&markers=icon:https://eatibl.com/assets/images/eatibl-pin.png|"+this.restaurant.latitude+","+this.restaurant.longitude+"&key=AIzaSyAr99dcWf_ri92qrY7ZmcI54Uv0oaGXd2w";
  }

  //Open the users relevant maps app to navigate to the restaurant
  openMaps(){
    this.launchNavigator.navigate(this.restaurant.address);
  }

  //Filter timeslots for the currently selected date
  processTimeslots(){
    var hour = (parseInt(moment().format('k')) + (parseInt(moment().format('m')) / 60));
    var date = this.date;

    //Filter timeslots by date and time
    this.timeslots = _.filter(this.timeslotsData, function(timeslot){
      if(moment(date).isSame(moment(), 'day'))
        return (timeslot.day == moment(date).format('dddd').toString() && timeslot.time > hour);
      else
        return (timeslot.day == moment(date).format('dddd').toString());
    });

    this.timeslots = _.sortBy(this.timeslots, 'time');

    this.isLoaded = true;

    //Activate timeslot on load if one exists
    if(this.timeslotId != ''){
      var timeslotId = this.timeslotId; //Avoid this scoping issues in filter

      var timeslot = _.filter(this.timeslots, function(timeslot){
        return timeslot._id == timeslotId;
      });
      this.selectBooking(timeslot[0]);
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
    if(this.slides)
      if(!this.slides.isEnd())
        this.slides.slideNext();
  }

  prevSlide(){
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
    this.navCtrl.push('ConfirmBookingPage', {
      restaurant: restaurant,
      timeslot: timeslot,
      people: people,
      date: date
    });
  }

  setNow(){
    this.today = moment().format();
    this.maxDate = moment().add(30, 'day').format();
  }

  //Determine and set distance in km from restaurant to user location
  setDistance(){
    //Get distance only if coordinates are available
    if(this.location && this.restaurant.latitude && this.restaurant.longitude){
      var distance = this.functions.getDistanceFromLatLonInKm(this.location['coords']['latitude'], this.location['coords']['longitude'], this.restaurant.latitude, this.restaurant.longitude);
      this.distance = this.functions.roundDistances(distance);
    }
  }
}
