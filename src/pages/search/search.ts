import {Component, ChangeDetectorRef} from '@angular/core';
import {IonicPage, NavController, Events} from 'ionic-angular';
import {Subscription} from "rxjs";
import {GeolocationServiceProvider} from "../../providers/geolocation-service/geolocation-service";
import {RestaurantServiceProvider} from "../../providers/restaurant-service/restaurant-service";
import {ActivityLoggerProvider} from "../../providers/activity-logger/activity-logger";
import * as _ from 'underscore';
import * as moment from 'moment';
import {FunctionsProvider} from "../../providers/functions/functions";

/**
 * Generated class for the SearchPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-search',
  templateUrl: 'search.html',
})
export class SearchPage {

  private locationSub: Subscription;

  userCoords = [];
  restoAll: any; //entire list
  restoFiltered: any; //entire list
  loadingRestaurants = true;
  sortType = 'alpha'; //either sort alphabetically or by distance (if we have device location)
  searchInput = '';
  deviceLocation: boolean;
  searchLog = [] as any;
  locationError = false;
  firstLoad = true; //Get restaurants on initial load of search page

  constructor(
    private functions: FunctionsProvider,
    public navCtrl: NavController,
    private log: ActivityLoggerProvider,
    private cdRef:ChangeDetectorRef,
    public events: Events,
    private geolocationService: GeolocationServiceProvider,
    private restaurantService: RestaurantServiceProvider
  ) {

    events.subscribe('location:error', () => {
      if(this.loadingRestaurants)
        this.locationError = true;
    });

    this.locationSub = this.geolocationService.observableLocation.subscribe(location => {
      if(location) //Sometimes on iOS location is undefined
        if(location.coords.length){
          this.deviceLocation = location.device; //Only show distance if device location is known
          this.userCoords = [location.coords[0], location.coords[1]];
          this.setDistances();
          if(this.geolocationService.manualReload || this.firstLoad){
            this.getRestaurants();
            this.geolocationService.toggleManualReload(false);
            this.firstLoad = false;
          }
        }
    });
  }

  //Handle location error
  handleLocationError(cond){ //True will try getting device location again, false will use default location
    if(cond){
      if(!this.geolocationService.location.coords.length)
        this.geolocationService.startTracking(true);
    }
    else
      this.geolocationService.setLocation(this.geolocationService.locationDefault.coords, this.geolocationService.locationDefault.text);
    this.locationError = false;
    if(!this.loadingRestaurants)
      this.loadingRestaurants = true;
    setTimeout(() => {
      this.loadingRestaurants = false;
    }, 500)
  }

  ionViewDidLeave(){
    if(this.searchLog.length)
      this.log.sendEvent('User Search Input', 'Search', this.searchLog.join());
  }

  //Package search inputs for logging
  packageSearch(input){

    if(input.length){ //All subsequent inputs
      this.searchLog.push(input);

      var prevIndex = this.searchLog.length - 2,
          currentIndex = this.searchLog.length - 1;

      if(prevIndex >= 0) { //make sure prevIndex exists
        if (input.indexOf(this.searchLog[prevIndex]) > -1) //latest input is continuation of previous input
          this.searchLog.splice(prevIndex, 1); //remove previous entry
        else if(this.searchLog[prevIndex].indexOf(input) > -1) //latest input is a deletion of previous input
          this.searchLog.splice(currentIndex, 1); //remove current entry
      }
    }
  }

  //Get restaurant list
  getRestaurants(){
    this.loadingRestaurants = true;

    this.restaurantService.getRestos(this.userCoords, false, (data) => {
      var sortedData = _.sortBy(data, (resto) => {
        if(this.sortType == 'alpha'){return resto['name']}
        if(this.sortType == 'distance'){return resto['distance']}
      });

      this.loadingRestaurants = false;
      this.restoAll = sortedData;
      this.restoFiltered = sortedData;
      this.updateList();
      this.setDistances();
      this.cdRef.detectChanges();
    });
  }

  updateList(){

    //Filter down the list through keyword
    if (this.searchInput.length) {
      this.restoFiltered = this.restoAll.filter((resto) => {
        //check if keyword shows up in either name or vicinity
        var nameCheck = resto['name'].toLowerCase().indexOf(this.searchInput.toLowerCase()) > -1;

        if(resto.vicinity)
          var vicinityCheck = resto['vicinity'].toLowerCase().indexOf(this.searchInput.toLowerCase()) > -1;
        else
          var vicinityCheck = false;

        return nameCheck || vicinityCheck;
      });
    } else {this.restoFiltered = this.restoAll;}
  }

  //Determine and set distance in km from restaurant to user location
  setDistances(){
    if(this.restoAll)
      for(var i = 0; i < this.restoAll.length; i++){
        //Get distance only if coordinates are available
        if(this.userCoords && this.restoAll[i].latitude && this.restoAll[i].longitude){
          var distance = this.functions.getDistanceFromLatLonInKm(this.userCoords[0], this.userCoords[1], this.restoAll[i].latitude, this.restoAll[i].longitude);
          this.restoAll[i].distanceFormatted = this.functions.roundDistances(distance);
        }
      }
  }

  sortBy(sortType){

    if(sortType == 'distance'){
      this.geolocationService.useDeviceLocation((result) => {
        if(result){
          this.log.sendEvent('Sorted By Distance', 'Search', '');

          //update sortType for all purposes
          this.sortType = sortType;

          //sort restoAll by new sortType
          this.restoAll = _.sortBy(this.restoAll, (resto) => {
            if(this.sortType == 'distance'){return resto['distance']}
          });
          this.updateList()
        }
      });
    }
    //sort restoAll by new sortType
    else if(sortType == 'alpha'){
      this.log.sendEvent('Sorted By Alphabetical', 'Search', '');
      //update sortType for all purposes
      this.sortType = sortType;
      this.restoAll = _.sortBy(this.restoAll, (resto) => {
        if(this.sortType == 'alpha'){return resto['name']}
      });
      this.updateList()
    }
    //sort restoAll by discount
    else if (sortType == 'discount'){
      this.log.sendEvent('Sorted By Discount', 'Search', '');
      //update sortType for all purposes
      this.sortType = sortType;
      this.restoAll = _.sortBy(this.restoAll, (resto) => {
        if(this.sortType == 'distance'){return resto['distance']}
      });
      this.restoAll = _.sortBy(this.restoAll, (resto) => {
        if(this.sortType == 'discount' && resto['maxTimeslot']){return -resto['maxTimeslot']['discount']}
      });
      this.updateList()
    }

  }

  navigateTo(restaurant){
    setTimeout(() => {
      this.log.sendRestoEvent('Restaurant Item Clicked', 'Search', restaurant.name, restaurant._id);
      this.navCtrl.push('RestaurantPage', {
        restaurant: JSON.stringify(restaurant),
        timeslotsData: JSON.stringify(restaurant.timeslots),
        businessHoursData: JSON.stringify(restaurant.businessHours),
        timeslotId: '',
        distance: restaurant.distanceFormatted,
        date: moment().format(),
        time: moment().add(30 - moment().minute() % 30, 'm').format()
      });
    }, 0)
  }
}
