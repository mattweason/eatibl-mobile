import { Component, OnInit, ViewChild } from '@angular/core';
import { IonicPage, NavController, NavParams, Slides } from 'ionic-angular';
import { DatePicker } from '@ionic-native/date-picker';
import { ApiServiceProvider } from "../../providers/api-service/api-service";
import { FunctionsProvider } from '../../providers/functions/functions';
import { GoogleMaps, GoogleMap, GoogleMapsEvent, GoogleMapOptions, CameraPosition, MarkerOptions, Marker } from '@ionic-native/google-maps';
import * as _ from 'underscore';
import moment from 'moment';

import { ConfirmBookingPage } from '../../pages/confirm-booking/confirm-booking';

/**
 * Generated class for the RestaurantPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@Component({
  selector: 'page-restaurant',
  templateUrl: 'restaurant.html',
})
export class RestaurantPage implements OnInit {
  private slides: Slides;
  @ViewChild('slides') set content(content: Slides) {
    this.slides = content;
    if(this.timeslotId != '' && this.slides)
      this.setSlide();
  }

  timeslots: any;
  timeslotsData = {} as any;
  businessHours = [['Monday','Mon','',''],['Tuesday','Tue','',''],['Wednesday','Wed','',''],['Thursday','Thu','',''],['Friday','Fri','',''],['Saturday','Sat','',''],['Sunday','Sun','','']];
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

  map: GoogleMap;

  constructor(public navCtrl: NavController, public navParams: NavParams, private API: ApiServiceProvider, private datePicker: DatePicker, private functions: FunctionsProvider, private googleMaps: GoogleMaps) {
    this.restaurantId = navParams.get('restaurantId');
    this.timeslotId = navParams.get('timeslotId');
    this.date = navParams.get('date');
    this.setNow();

  }

  ionViewDidLoad() {
    this.loadMap();
    this.type = "about";
  }

  ngOnInit(){
    this.API.makeCall('restaurant/' + this.restaurantId).subscribe(data => this.restaurant = data);
    this.API.makeCall('discount/' + this.restaurantId + '/week').subscribe(data => {
      this.timeslotsData = data;
      this.processTimeslots();
    });
    this.API.makeCall('hours/' + this.restaurantId).subscribe(data => {
      this.businessHoursData = data;
      this.processBusinessHours();
    });
  }

  loadMap() {

    let mapOptions: GoogleMapOptions = {
      camera: {
        target: {
          lat: 43.0741904,
          lng: -89.3809802
        },
        zoom: 18,
        tilt: 30
      }
    };

    this.map = new GoogleMap('map', mapOptions);

    // Wait the MAP_READY before using any methods.
    this.map.one(GoogleMapsEvent.MAP_READY)
      .then(() => {
        console.log('Map is ready!');

        // Now you can use all methods safely.
        this.map.addMarker({
          title: 'Ionic',
          icon: 'blue',
          animation: 'DROP',
          position: {
            lat: 43.0741904,
            lng: -89.3809802
          }
        })
          .then(marker => {
            marker.on(GoogleMapsEvent.MARKER_CLICK)
              .subscribe(() => {
                alert('clicked');
              });
          });

      });
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
    var index = _.findIndex(this.businessHours, function(businessDay){
      return businessDay[0] == days[day];
    });

    //Converting open and close hours from string to numbers
    var open: Number = +this.businessHours[index][2];
    var close: Number = +this.businessHours[index][3];

    //Compare current time to open close hours and set to this.open
    var isOpen = open <= time && close >= time;


    this.open = {
      open: isOpen,
      index: index
    }
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
      console.log(this.timeslotId);
      console.log(this.timeslots)
      console.log(timeslot)
      this.selectBooking(timeslot[0]);
    }
  }

  //Activate a booking
  selectBooking(timeslot){
    this.activeTimeslot = timeslot;
  }

  //Add open and close hours to businessHours array for ngFor loop in view
  processBusinessHours(){
    for (var i = 0; i < this.businessHoursData.length; i++)
      for(var a = 0; a < this.businessHours.length; a++)
        if(this.businessHours[a][0] == this.businessHoursData[i]['day']){
          this.businessHours[a][2] = this.businessHoursData[i]['open'];
          this.businessHours[a][3] = this.businessHoursData[i]['close'];
        }
    this.isOpen();
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

  //Navigate to confirm booking page
  bookNow(event, restaurant, timeslot, people, date){
    this.navCtrl.push(ConfirmBookingPage, {
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
}
