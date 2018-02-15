import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { DatePicker } from '@ionic-native/date-picker';
import { ApiServiceProvider } from "../../providers/api-service/api-service";
import { FunctionsProvider } from '../../providers/functions/functions';
import { GoogleMaps, GoogleMap, GoogleMapsEvent, GoogleMapOptions, CameraPosition, MarkerOptions, Marker } from '@ionic-native/google-maps';
import * as _ from 'underscore'

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
export class RestaurantPage {

  restaurant: any;
  timeslots = [];
  activeTimeslot: any;
  people: Number = 2;
  businessHours = [['Monday','Mon','',''],['Tuesday','Tue','',''],['Wednesday','Wed','',''],['Thursday','Thu','',''],['Friday','Fri','',''],['Saturday','Sat','',''],['Sunday','Sun','','']];
  open: any;
  restaurantId: String;
  timeslotId: String;
  type: String;
  selectedDate: any;

  map: GoogleMap;

  constructor(public navCtrl: NavController, public navParams: NavParams, private API: ApiServiceProvider, private datePicker: DatePicker, private functions: FunctionsProvider, private googleMaps: GoogleMaps) {
    this.restaurantId = navParams.get('restaurantId');
    this.timeslotId = navParams.get('timeslotId');
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad RestaurantPage');
    this.loadMap();
    this.type = "about";
  }

  ngOnInit(){
    this.API.makeCall('restaurant/' + this.restaurantId).subscribe(data => this.restaurant = data);
    this.API.makeCall('discount/' + this.restaurantId + '/week').subscribe(data => this.processTimeslots(data));
    this.API.makeCall('hours/' + this.restaurantId).subscribe(data => this.processBusinessHours(data));
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
    var date = this.selectedDate || new Date(Date.now());
    var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    var day = days[date.getDay()];

    this.timeslots = _.filter(data, function(timeslot){
      return timeslot.day == day;
    });

    //Activate timeslot on load if one exists
    if(this.timeslotId != ''){
      var timeslotId = this.timeslotId; //Avoid this scoping issues in filter

      var timeslot = _.filter(this.timeslots, function(timeslot){
        return timeslot._id == timeslotId;
      });
      this.selectBooking(timeslot[0]);
    }
  }

  //Activate a booking
  selectBooking(timeslot){
    console.log(timeslot)
    this.activeTimeslot = timeslot;
  }

  //Add open and close hours to businessHours array for ngFor loop in view
  processBusinessHours(data){
    for (var i = 0; i < data.length; i++)
      for(var a = 0; a < this.businessHours.length; a++)
        if(this.businessHours[a][0] == data[i]['day']){
          this.businessHours[a][2] = data[i]['open'];
          this.businessHours[a][3] = data[i]['close'];
        }
    this.buildTodayDate();
  }
}
