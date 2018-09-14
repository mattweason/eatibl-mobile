import { Component, ViewChild, OnInit, ChangeDetectorRef } from '@angular/core';
import {IonicPage, NavController, Content, ModalController} from 'ionic-angular';
import { ApiServiceProvider } from "../../providers/api-service/api-service";
import { ActivityLoggerProvider } from "../../providers/activity-logger/activity-logger";
import { FunctionsProvider } from '../../providers/functions/functions';
import { Device } from '@ionic-native/device';
import { Diagnostic } from '@ionic-native/diagnostic';
import { Facebook, FacebookLoginResponse } from '@ionic-native/facebook';
import { Events } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import * as moment from 'moment';
import * as _ from 'underscore';


import {
  GoogleMaps, GoogleMap, GoogleMapsEvent, GoogleMapOptions, CameraPosition, MarkerOptions, Marker,
  BaseArrayClass, MarkerIcon
} from '@ionic-native/google-maps';

@IonicPage()
@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {
  @ViewChild(Content) content: Content;

  restaurantList: any; //just the ones loaded
  restaurantAll: any; //entire list
  restaurantPicks = []; //List of restaraunt of today's top picks (total of 5)
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
  hideMap = false;
  customLocation = false;
  loadMorePressed: number = 0; //Increments by one each time load more is pressed
  loadMoreCount: number = 10; //Number of additional nearby restaurants loaded when load more is pressed
  initLoadCount: number = 5; //Number of nearby restaurants loaded initially
  lastOpenMarkerIndex: any;
  showNoDeals = true;
  allMarkers: any;
  cacheDate: any; //Cache the select date from the map view
  loadingRestaurants = true;

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
    private diagnostic: Diagnostic,
    private log: ActivityLoggerProvider,
    private fb: Facebook
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

    //Update location when user geolocated event is recieved
    events.subscribe('user:newLocation', () => {
      this.getRestaurants();
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
    this.loadingRestaurants = true;
    //This is the final endpoint of the geolocation/custom location process
    //Here is where we need to check if we need to show the intro slides or not
    this.storage.get('eatiblShowSlides').then((val) => {
      if(val) //If custom location, show card about custom location
        this.presentIntroModal();
    });

    this.API.makePost('restaurant/all/geolocated/', this.userCoords).subscribe(data => {
      this.events.publish('reveal:restaurants');
      this.loadingRestaurants = false;
      this.dataCache = data;
      this.setNow(true); //rankRestaurants runs inside here
      this.cdRef.detectChanges();
    });
  }

  //Fires when the home page tab is selected and is already active
  ionSelected() {
    this.log.sendEvent('Scroll to Top', 'Home', '');
    this.content.scrollToTop();
  }

  loadMap() {
    //Zoom and center to user location
    let startingPoint = [43.655413, -79.392229];
    let myStyles =[
      {
        featureType: "poi",
        elementType: "labels",
        stylers: [
          { visibility: "off" }
        ]
      }
    ];
    let mapOptions: GoogleMapOptions = {
      camera: {
        target: {
          lat: startingPoint[0],
          lng: startingPoint[1]
        },
        zoom: 13
      },
      gestures: {
        tilt: false,
        rotate: false
      },
      preferences: {
        zoom: {
          minZoom: 8,
          maxZoom: 18
        }
      },
      styles: myStyles
    };

    // Create a map after the view is ready and the native platform is ready.
    this.map = GoogleMaps.create('mapCanvas', mapOptions);

    //Enable location for map if we have access to device location
    this.diagnostic.isLocationAvailable().then((state) => {
      this.map.setMyLocationEnabled(state)
    }).catch(() => {
      console.log('failed')
    })

    //Add all restaurants as markers
    var restoDeals: any[] = [];
    var minute = parseInt(moment(this.date).format('m')) / 60;
    var hour = parseInt(moment(this.date).format('k')) + minute + 0.25;
    var day = hour < 6 ? moment(this.date).subtract(1, 'days').format('dddd') : moment(this.date).format('dddd'); //If before 6am, still considered day before
    hour = hour < 6 ? hour + 24 : hour; //Convert hour to 6 to 30 format

    for(var i = 0; i < this.restaurantAll.length; i++){
      var resto = this.restaurantAll[i]; //Cache this iteration of restaurantList

      if(resto.timeslots.length){
        var current = this;
        resto['timeslotsToday'] = _.filter(resto.timeslots, function(timeslot){
          if(moment(current.date).isSame(moment(), 'day'))
            return timeslot.day == day && timeslot.time >= hour;
          else
            return timeslot.day == day;
        });

        restoDeals.push({
          title: resto.name,
          icon: {
            url: resto['timeslotsToday'].length ? 'https://eatibl.com/assets/images/eatibl-pin-red.png' : 'https://eatibl.com/assets/images/eatibl-pin-grey.png',
            size:{
              width: 24,
              height: 38
            }
          },
          position: {
            lat: resto.latitude,
            lng: resto.longitude
          },
          test: resto._id,
          disableAutoPan: true,
          visible: this.showNoDeals ? true : (resto['timeslotsToday'].length ? true : false),
          metadata: {
            id: resto._id,
            originalIcon: resto['timeslotsToday'].length ? 'https://eatibl.com/assets/images/eatibl-pin-red.png' : 'https://eatibl.com/assets/images/eatibl-pin-grey.png',
            visible: resto['timeslotsToday'].length ? true : false
          }
        })
      }
    }

    //Add markers to map in parallel (add marker is async)
    let baseArray: BaseArrayClass<any> = new BaseArrayClass<any>(restoDeals);
    baseArray.mapAsync((mOption: any, callback: (marker: Marker) => void) => {
      this.map.addMarker(mOption).then(callback);
    }).then((markers: Marker[]) => {
      this.allMarkers = markers; //Cache all markers

      // Listen the MARKER_CLICK event on all markers
      markers.forEach((marker: Marker, index) => {
        marker.on(GoogleMapsEvent.MARKER_CLICK).subscribe((params: any[]) => {
          let marker: Marker = params.pop();
          let icon: MarkerIcon = {
            url: 'https://eatibl.com/assets/images/eatibl-pin-blue.png',
            size:{
              width: 24,
              height: 38
            }
          };

          marker.setIcon(icon); //Change marker color on click

          this.logClickedMapMarkerEvent('Clicked Map Marker', marker.get('metadata').id);

          //Change last marker back to original icon
          if(this.lastOpenMarkerIndex !== undefined)
            this.changeLastMarkerToInactive(markers, this.lastOpenMarkerIndex);

          this.lastOpenMarkerIndex = index; //Cache current marker index

          //Display restaurant box
          this.selectResto(marker.get('metadata').id);
        });
      });

      this.togglingView = false;
    });

    //Zoom into user's location
    this.map.on(GoogleMapsEvent.MAP_READY).subscribe(() => {
      this.map.animateCamera({
        target: {lat: this.userCoords[0], lng: this.userCoords[1]},
        zoom: 14,
        duration: 1500
      });
    });

    //HACK SOLUTION: allow toggle view after 4 seconds
    setTimeout(function () {
      if(this.togglingView)
        this.togglingView = false;
    }, 4000);
  }

  //send facebook event
  logClickedMapMarkerEvent(eventName, restaurantID) {
    var params = {};
    params['RestaurantID'] = restaurantID;
    this.fb.logEvent(eventName, params, null);
  }

  //Update markers when date has changed
  updateMarkers(){
    // Listen the MARKER_CLICK event on all markers
    this.allMarkers.forEach((marker: Marker, index) => {
      var resto = _.find(this.restaurantAll, function(resto){
        return resto._id == marker.get('metadata').id;
      });

      var minute = parseInt(moment(this.date).format('m')) / 60;
      var hour = parseInt(moment(this.date).format('k')) + minute + 0.25;
      var day = hour < 6 ? moment(this.date).subtract(1, 'days').format('dddd') : moment(this.date).format('dddd'); //If before 6am, still considered day before
      hour = hour < 6 ? hour + 24 : hour; //Convert hour to 6 to 30 format

      if(resto.timeslots.length) {
        var current = this;
        resto['timeslotsToday'] = _.filter(resto.timeslots, function (timeslot) {
          if (moment(current.date).isSame(moment(), 'day'))
            return timeslot.day == day && timeslot.time >= hour;
          else
            return timeslot.day == day;
        });

        let icon: MarkerIcon = {
          url: resto['timeslotsToday'].length ? 'https://eatibl.com/assets/images/eatibl-pin-red.png' : 'https://eatibl.com/assets/images/eatibl-pin-grey.png',
          size:{
            width: 24,
            height: 38
          }
        };

        marker.setIcon(icon); //Change marker color on click
      }
    });
  }

  changeLastMarkerToInactive(markers, index) {
    let icon: MarkerIcon = {url: markers[index].get('metadata').originalIcon};
    markers[index].setIcon(icon);
  }

  //Populate the selected restaurant from the tapped marker
  selectResto(markerId){
    for (var i = 0; i < this.restaurantAll.length; i++){
      var resto = this.restaurantAll[i];
      if(markerId == resto._id){
        this.selectedResto = resto;
        this.processTimeslots();
        this.processBusinessHours();
        this.log.sendRestoEvent('Restaurant Marker: Selected', 'Map view', 'User clicked on the marker for: '+resto.name, resto._id);
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
      this.log.sendRestoEvent('Navigate to Restaurant', 'Map view', 'User clicked into restaurant: '+this.selectedResto.name, this.selectedResto._id);
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

  topPickSlider(direction){
    this.log.sendEvent('Browse through Top Picks', 'Home', 'User went: '+direction);
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
    if(this.view == 'list'){ //If view is currently list
      this.log.sendEvent('Map View: Loaded', 'Home', 'User switched from list view to map view');
      this.view = 'map';
      this.events.publish('view:map', true);
      this.selectedResto = {};
      this.loadMap();
    }
    else if(this.view == 'map'){ //If view is currently map
      this.log.sendEvent('List View: Loaded', 'Home', 'User switched from map view to list view');
      this.view = 'list';
      this.events.publish('view:map', false);
      this.togglingView = false;
      const nodeList = document.querySelectorAll('._gmaps_cdv_');

      if(!moment(this.date).isSame(moment(), 'day')) { //Only cache date and rerank restos if selected date is not today
        this.date = moment().format(); //Change date back to now for nearby list
        this.rankRestaurants(this.restaurantAll);
      }

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

    this.restaurantPicks = []; //reset restaurantPicks each time we start ranking (to update list based on new locations)

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
        rank = rank - 50;

      else //add to rank points based on discount (+1 per 10% discount at max available discount);
        rank = rank + restaurantList[i].maxTimeslot.discount / 10; //add 1pt for each 10% discount

      //if at least 5 timeslots today, add to rank
      if(timeslots.length > 4)
        rank++;

      //bonus and penalty for distance
      if(restaurantList[i].distance <= 2)
        rank = rank + 2/restaurantList[i].distance;
      else if(restaurantList[i].distance > 2 && restaurantList[i].distance <= 6)
        rank = rank - 0.5*restaurantList[i].distance + 2;
      else if(restaurantList[i].distance > 6)
        rank = rank - restaurantList[i].distance + 2;

      restaurantList[i].rank = rank; //SET RANKING
    }

    //sort list by rankings
    restaurantList = _.sortBy(restaurantList, function(resto){
      return -resto.rank;
    });

    this.restaurantList = restaurantList.slice(0,this.initLoadCount); //load first 5
    this.restaurantAll = restaurantList; //store all restos
    this.batch++;

    //Get top picks based on current ranking
    for (var i = 0; i < this.restaurantAll.length; i++){
      if(this.restaurantAll[i].maxTimeslot) //make sure all our entries have some discount (will never happen but Matt insisted on it)
       if(this.restaurantPicks.length < 5 && this.restaurantAll[i].maxTimeslot.discount > 15)
          this.restaurantPicks.push(this.restaurantAll[i]);
    }
    //Log the top 5 results for the today's top picks
    this.restaurantDisplayLog(this.restaurantPicks, 0, true);

    //Send first batch of restaurants to backend for logging
    this.restaurantDisplayLog(this.restaurantList, 0, false);

    //When you've selected a restaurant and changed the date, update the restaurant data
    if(this.view == 'map'){
      if(this.selectedResto._id){
        this.processBusinessHours();
        this.processTimeslots();
      }
      this.updateMarkers();
    }
    this.cdRef.detectChanges();
  }

  //Pull down to refresh the restaurant list
  doRefresh(refresher){
    this.log.sendEvent('List View: Refreshed', 'Home', 'User refreshed the restaurant list');
    this.events.publish('get:geolocation', Date.now()); //Tell the app.component we need the latest geolocation
    this.API.makePost('restaurant/all/geolocated/', this.userCoords).subscribe(data => {
      this.loadMorePressed = 0;
      this.batch = 0;
      this.rankRestaurants(data);
      refresher.complete();
    });
  }

  //Load 10 more restaurants, but not more than 25
  loadMore(){
    this.log.sendEvent('Load More: Pressed', 'Home', 'User requested to load more restaurants: ' + (this.loadMorePressed == 0 ? 'first time' : 'second time'));

    this.loadMorePressed++;
    var limit = this.initLoadCount + this.loadMorePressed * this.loadMoreCount;
    var currentBatch = []; //for display log

    for(var i = this.restaurantList.length; i < limit; i++) {
      this.restaurantList.push(this.restaurantAll[i]); //add restaurant to the current display list
      currentBatch.push(this.restaurantAll[i]);
    }
    //capture restaurants displayed in this batch and send to log
    this.restaurantDisplayLog(currentBatch, limit - this.loadMoreCount, false);
  }

  //Navigate to search page
  goToSearch(){
    this.log.sendEvent('Tab Changed to: Search', 'Home', '');
    this.events.publish('request:changeTab', 1);
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
  restaurantDisplayLog(restoList, currentIndex, isTopPicks){
    var formattedList = [];
    //format restoList before sending it over
    for (var i = 0; i < restoList.length; i++){

      var currentHour = this.time ? moment(this.time).format('H') : moment(this.date).format('H');
      var currentMinute = this.time ? moment(this.time).format('m') : moment(this.date).format('m');

      var selectedTime = Math.round((parseInt(currentHour) + parseInt(currentMinute)/60) * 100) / 100;

      formattedList.push({
        page: isTopPicks ? 'topPicks' : 'nearby',
        deviceId: this.device.uuid,
        restaurant_fid: restoList[i]._id,
        restaurantName: restoList[i].name,
        selectedDay: this.date,
        selectedTime: selectedTime,
        bestDeal: restoList[i].maxTimeslot.discount,
        rank: currentIndex + i,
        location: this.userCoords,
        distance: Math.round(restoList[i].distance * 100) / 100
      });
    }

    this.API.makePost('log/trackDisplayActivity', {restaurants: formattedList}).subscribe(() => {});
  }
}
