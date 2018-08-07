import { Component, ViewChild, OnInit, ChangeDetectorRef } from '@angular/core';
import {IonicPage, NavController, Content, ModalController} from 'ionic-angular';
import { ApiServiceProvider } from "../../providers/api-service/api-service";
import { ActivityLoggerProvider } from "../../providers/activity-logger/activity-logger";
import { FunctionsProvider } from '../../providers/functions/functions';
import { Device } from '@ionic-native/device';
import { Events } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import * as moment from 'moment';
import * as _ from 'underscore';


import { GoogleMaps, GoogleMap, GoogleMapsEvent, GoogleMapOptions, CameraPosition, MarkerOptions, Marker } from '@ionic-native/google-maps';

@IonicPage()
@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {
  @ViewChild(Content) content: Content;

  restaurantList: any; //just the ones loaded
  restaurantAll: any; //entire list
  selectedResto = {} as any; //Restaurant data of the selected marker
  timeslotsLength: any; //Used to see if restaurant has discounts for a day
  businessHours = [];
  openStatus: string;
  dataCache: any; //Cache the api return
  bookings = [];
  date: string;
  today: string; //sets the minimum of the date picker
  maxDate: string;
  time: any;
  view = 'list';
  togglingView = false; //Disables toggle view button when true
  showToolbar: boolean = true;
  userCoords: any;
  firstCall = true;
  batch = 0; //Represents the batch number
  allResults = false; //Becomes true when we've retrieved all of the restaurants.
  hideMap = false;
  customLocation = false;

  map: GoogleMap;

  constructor(
    public navCtrl: NavController,
    private API: ApiServiceProvider,
    private functions: FunctionsProvider,
    private cdRef:ChangeDetectorRef,
    private modal: ModalController,
    private device: Device,
    public events: Events,
    private storage: Storage,
    private log: ActivityLoggerProvider
  ) {
    //Update location when user geolocated event is recieved
    events.subscribe('user:geolocated', (location, time) => {
      this.userCoords = location;

      //Only request the geolocated restaurant list the first time this event is received
      if(this.firstCall){
        this.firstCall = false;
        this.getRestaurants();
      }
    });

    //Find out if we have a custom location
    this.storage.get('eatiblLocation').then((val) => {
      if(val) //If custom location, show card about custom location
        this.customLocation = true;
    });

    //Move other map out of the way when position map is opened
    events.subscribe('view:positionMap', (mapOpen) => {
      this.hideMap = mapOpen;
    });
  }

  //Open intro slides
  presentIntroModal(){
    this.log.sendEvent('Intro Slides', 'Home', 'Default Intro slides for first time users');
    const introModal = this.modal.create('IntroSlidesPage');
    introModal.onDidDismiss(() => {
      this.API.makePost('user/device/hideSlides', {deviceId: this.device.uuid}).subscribe(result => {}); //Update device id listing to not show slides on this device
      this.storage.remove('eatiblShowSlides');
    });
    introModal.present();
  }

  //Get restaurant list
  getRestaurants(){
    //This is the final endpoint of the geolocation/custom location process
    //Here is where we need to check if we need to show the intro slides or not
    this.storage.get('eatiblShowSlides').then((val) => {
      console.log('eatibl show slides: ' + val)
      if(val) //If custom location, show card about custom location
        this.presentIntroModal();
    });

    this.API.makePost('restaurant/all/geolocated/', this.userCoords).subscribe(data => {
      this.events.publish('reveal:restaurants');
      this.dataCache = data;
      this.setNow(true); //rankRestaurants runs inside here
      this.cdRef.detectChanges();
    });
  }

  //Modal for letting the user select their location manually
  openMap(){
    this.log.sendEvent('Location Modal: Open', 'Home', 'Clicked set location button at bottom section');
    this.events.publish('view:positionMap', true); //Get tabs page to set opacity to 0
    const mapModal = this.modal.create('SetPositionModalPage', {location: this.userCoords});
    mapModal.onDidDismiss((locationUpdated) => {
      this.events.publish('view:positionMap', false); //Get tabs page to set opacity to 1

      if(locationUpdated) //Did user update the location in the modal
        this.storage.get('eatiblLocation').then((val) => { //If so get the new location and get new ranked list of restaurants
          if(val) { //Custom location has been set, set userCoords to custom value
            this.userCoords = val;
            this.customLocation = true;
            this.log.sendEvent('Custom Location: Set', 'Set Position Modal', 'User successfully set a custom location');
          } else {
            this.customLocation = false;
            this.log.sendEvent('Custom Location: Unchanged', 'Set Position Modal', 'User did not make changes to their location data');
          }
          this.getRestaurants(); //Whether we have an updated custom location, or changed to auto locate, get new list of restaurants
        });
    });
    mapModal.present();
  }

  //Fires when the home page tab is selected and is already active
  ionSelected() {
    this.log.sendEvent('Scroll to Top', 'Home', '');
    this.content.scrollToTop();
  }

  loadMap() {
    //Zoom and center to user location
    let mapOptions: GoogleMapOptions = {
      camera: {
        target: {
          lat: this.userCoords[0],
          lng: this.userCoords[1]
        },
        zoom: 12
      },
      gestures: {
        tilt: false,
        rotate: false
      },
      preferences: {
        zoom: {
          minZoom: 8,
          maxZoom: 16
        }
      }
    };

    // Create a map after the view is ready and the native platform is ready.
    this.map = GoogleMaps.create('mapCanvas', mapOptions);

    //Add all restaurants as markers
    var counter = 0; //For re-enabling the toggle button
    for(var i = 0; i < this.restaurantAll.length; i++){
      var resto = this.restaurantAll[i]; //Cache this iteration of restaurantList
      var current = this;

      (function(resto, current) { //Self invoking to enclose each individual resto data
        current.map.addMarker({
          title: resto.name,
          icon: resto.timeslots.length ? 'https://eatibl.com/assets/images/eatibl-pin-red.png' : 'https://eatibl.com/assets/images/eatibl-pin-grey.png',
          position: {
            lat: resto.latitude,
            lng: resto.longitude
          },
          test: resto._id,
          disableAutoPan: true
        }).then((marker: Marker) => {
          counter++;
          marker['metadata'] = {id: resto._id};
          marker.on(GoogleMapsEvent.MARKER_CLICK).subscribe(() => {
            current.selectResto(marker['metadata'].id);
          });
          if(counter == current.restaurantAll.length)
            current.togglingView = false;
        }).catch();
      }(resto, current));
    }

    //HACK SOLUTION: allow toggle view after 4 seconds
    setTimeout(function () {
      if(this.togglingView)
        this.togglingView = false;
    }, 4000);
  }

  //Populate the selected restaurant from the tapped marker
  selectResto(markerId){
    for (var i = 0; i < this.restaurantAll.length; i++){
      var resto = this.restaurantAll[i];
      if(markerId == resto._id){
        this.selectedResto = resto;
        this.processTimeslots();
        this.processBusinessHours();
        this.log.sendEvent('Restaurant Marker: Selected', 'Map view', 'User clicked on the marker for: '+resto.name);
      }
    }
    this.cdRef.detectChanges();
  }

  //Filter timeslots for the currently selected date
  processTimeslots(){
    var hour = (parseInt(moment().format('k')) + (parseInt(moment().format('m')) / 60));
    var date = this.date;

    var timeslots;

    //Filter timeslots by date and time
    timeslots = _.filter(this.selectedResto.timeslots, function(timeslot){
      if(moment(date).isSame(moment(), 'day'))
        return (timeslot.day == moment(date).format('dddd').toString() && timeslot.time > hour);
      else
        return (timeslot.day == moment(date).format('dddd').toString());
    });

    this.timeslotsLength = timeslots.length;
  }

  //Add open and close hours to businessHours array for ngFor loop in view
  processBusinessHours(){
    for (var i = 0; i < this.selectedResto.businesshours.length; i++)
      if(this.selectedResto.businesshours[i]['day'] == moment(this.date).format('dddd').toString()){
        this.businessHours = this.selectedResto.businesshours[i]['hours'];
      }
    this.checkOpen();
  }

  //To establish open now or closed in view
  checkOpen(){
    //Get current time to compare to open close hours for day
    var time = this.functions.formatTime(this.date);
    var hoursLength = this.businessHours.length;

    if(hoursLength == 0)
      this.openStatus = 'closedToday';

    //Compare current time to open close hours and set to this.open
    if(hoursLength == 2){
      if(time >= this.businessHours[0] && time < this.businessHours[1]) //During business hours
        this.openStatus = 'open';
      if(time >= this.businessHours[1] ) //After closed
        this.openStatus = 'closed';
      if(time < this.businessHours[0]) //Before open
        this.openStatus = 'willOpen';
    }
    if(hoursLength == 4){
      if((time >= this.businessHours[0] && time < this.businessHours[1]) || (time >= this.businessHours[2] && time < this.businessHours[3])) //During bussines hours
        this.openStatus = 'open';
      if(time >= this.businessHours[3]) //After second closed
        this.openStatus = 'closed';
      if((time <= this.businessHours[2] && time > this.businessHours[1]) || time < this.businessHours[0]) //Before first or second open, but after first closed
        this.openStatus = 'willOpen';
    }
  }

  navigateTo(event, timeslotId){
    if(this.selectedResto.timeslots.length){
      this.log.sendEvent('Navigate to Restaurant', 'Home || Map view', 'User clicked into restaurant: '+this.selectedResto.name);
      this.navCtrl.push('RestaurantPage', {
        restaurant: JSON.stringify(this.selectedResto),
        timeslotsData: JSON.stringify(this.selectedResto.timeslots),
        businessHoursData: JSON.stringify(this.selectedResto.businesshours),
        timeslotId: timeslotId,
        distance: this.selectedResto.distance,
        date: this.date,
        time: this.time
      });
    }
  }

  ionViewDidEnter(){
    //Call geolocation from app.component
    this.events.publish('view:map', (this.view == 'map')); //Pop help button into correct position
    this.events.publish('get:geolocation', Date.now());
    this.events.publish('loaded:restaurant'); //Tell restaurant cards to rerun timeslots and businesshours processes
  }

  ionViewWillLeave(){
    this.events.publish('view:map', false); //Pop help button into correct position
  }

  //Toggles between list and map view
  toggleView(){
    this.togglingView = true;
    if(this.view == 'list'){
      this.log.sendEvent('Map View: Loaded', 'Home', 'User switched from list view to map view');
      this.view = 'map';
      this.events.publish('view:map', true);
      this.selectedResto = {};
      this.loadMap();
    }
    else if(this.view == 'map'){
      this.log.sendEvent('List View: Loaded', 'Home', 'User switched from map view to list view');
      this.view = 'list';
      this.events.publish('view:map', false);
      this.togglingView = false;
      const nodeList = document.querySelectorAll('._gmaps_cdv_');

      for (let k = 0; k < nodeList.length; ++k) {
        nodeList.item(k).classList.remove('_gmaps_cdv_');
      }
    }
  }

  //Ranking system to dictate order of display
  rankRestaurants(restaurantList){
    var day = moment(this.date).format('dddd'); //eg "Monday", "Tuesday"
    var today = moment().format('dddd'); //today's day in same format as above
    var hour = (parseInt(moment().format('k')) + (parseInt(moment().format('m')) / 60));

    for (var i = 0; i < restaurantList.length; i++){
      var rank = 100; //start with default value
      var timeslots = _.filter(restaurantList[i].timeslots, function(timeslot){

        if(today == day) //for today filter out spots that have already passed
          return timeslot.day == day && timeslot.time >= hour + 0.25; //Add a quarter hour to comparison to prevent bookings within 15 minutes of a booking time;
        else //for other days, show all available timeslots
          return timeslot.day == day;

      });

      //Make sure it's sorted by time ascending
      timeslots = _.sortBy(timeslots, 'time');

      //create a separate entry for the best timeslot available for the rest of today
      if(timeslots.length != 0){
        var maxDiscount = 0;
        for (var x = 0; x < timeslots.length; x++){
          if(timeslots[x].discount > maxDiscount){
            maxDiscount = timeslots[x].discount;
            restaurantList[i].maxTimeslot = timeslots[x];
          }
        }
      }
      else
        if(restaurantList[i].maxTimeslot)
          delete restaurantList[i].maxTimeslot;

      //BIG PENALTY IN RANKING FOR NO DISCOUNTS FOR TODAY
      if(timeslots.length == 0)
        rank = rank - 30;

      else //add to rank points based on discount (+1 per 10% discount at max available discount);
        rank = rank + restaurantList[i].maxTimeslot.discount / 10; //add 1pt for each 10% discount

      //if at least 5 timeslots today, add to rank
      if(timeslots.length > 4)
        rank++;

      //bonus and penalty for distance
      if(restaurantList[i].distance <= 2)
        rank = rank + 2/restaurantList[i].distance;
      else if(restaurantList[i].distance > 2 && restaurantList[i].distance <= 5)
        rank = rank - restaurantList[i].distance/2;
      else if(restaurantList[i].distance > 5)
        rank = rank - 6;

      restaurantList[i].rank = rank; //SET RANKING
    }

    //sort list by rankings
    restaurantList = _.sortBy(restaurantList, function(resto){
      return -resto.rank;
    });

    this.restaurantList = restaurantList.slice(0,10); //load first 10
    this.restaurantAll = restaurantList; //store all restos
    this.batch++;

    //Send first batch of restaurants to backend for logging
    this.restaurantDisplayLog(this.restaurantList, 0);

    //When you've selected a restaurant and changed the date, update the restaurant data
    if(this.view == 'map' && this.selectedResto){
      this.processBusinessHours();
      this.processTimeslots();
    }
    this.cdRef.detectChanges();
  }

  //Pull down to refresh the restaurant list
  doRefresh(refresher){
    this.log.sendEvent('List View: Refreshed', 'Home', 'User refreshed the restaurant list');
    this.events.publish('get:geolocation', Date.now()); //Tell the app.component we need the latest geolocation
    this.API.makePost('restaurant/all/geolocated/', this.userCoords).subscribe(data => {
      this.allResults = false;
      this.batch = 0;
      this.rankRestaurants(data);
      refresher.complete();
    });
  }

  //Call next batch of 10 restaurants when you reach the bottom of the page
  getNextBatch(infiniteScroll){
    this.log.sendEvent('Infinite Scroll: Loaded Next Batch', 'Home', 'User scrolled down until next batch was populated, batch #: '+this.batch);

    var limit = Math.min(this.batch*10+10, this.restaurantAll.length);
    var currentBatch = []; //for display log

    for(var i = this.batch*10; i < limit; i++){
      this.restaurantList.push(this.restaurantAll[i]); //add restaurant to the current display list
      currentBatch.push(this.restaurantAll[i]);
    }
    //capture restaurants displayed in this batch and send to log
    this.restaurantDisplayLog(currentBatch, this.batch);

    this.batch++;

    if(this.restaurantList.length == this.restaurantAll.length)
      this.allResults = true;

    infiniteScroll.complete();
  }


  toggleToolbar(){
    this.showToolbar = !this.showToolbar;
    this.content.resize();
  }

  setNow(initialCall){
    if(this.date != this.today || initialCall){
      this.date = this.today = moment().format();
      this.maxDate = moment().add(30, 'day').format();
      this.rankRestaurants(this.dataCache);
    }
    this.time = moment().add(30 - moment().minute() % 30, 'm').format();
  }
  //Keep track of when people are adjust date values
  logDate(action, data){
    if(action == 'changed')
      this.log.sendEvent('DatePicker: Updated', 'Home', JSON.stringify(data));
    if(action =='cancelled')
      this.log.sendEvent('DatePicker: Cancelled', 'Home', JSON.stringify(data));
  }

  //Keep track of when people are adjust time values
  logTime(action, data){
    if(action == 'changed')
      this.log.sendEvent('TimePicker: Updated', 'Home', JSON.stringify(data));
    if(action =='cancelled')
      this.log.sendEvent('TimePicker: Cancelled', 'Home', JSON.stringify(data));
  }

  //take a specific chunk of restaurants and log them to backend (revealing what is shown to specific users)
  restaurantDisplayLog(restoList, batchNumber){
    console.log(this.time);
    console.log(this.date);
    var formattedList = [];
    //format restoList before sending it over
    for (var i = 0; i < restoList.length; i++){

      var currentHour = this.time ? moment(this.time).format('H') : moment(this.date).format('H');
      var currentMinute = this.time ? moment(this.time).format('m') : moment(this.date).format('m');

      var selectedTime = Math.round((parseInt(currentHour) + parseInt(currentMinute)/60) * 100) / 100;

      formattedList.push({
        deviceId: this.device.uuid,
        restaurant_fid: restoList[i]._id,
        restaurantName: restoList[i].name,
        selectedDay: this.date,
        selectedTime: selectedTime,
        bestDeal: restoList[i].maxTimeslot.discount,
        rank: i + (batchNumber * 10),
        location: this.userCoords,
        distance: Math.round(restoList[i].distance * 100) / 100
      });
    }

    this.API.makePost('log/trackDisplayActivity', {restaurants: formattedList}).subscribe(() => {});
  }
}
