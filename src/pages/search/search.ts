import {Component, ChangeDetectorRef} from '@angular/core';
import {IonicPage, NavController} from 'ionic-angular';
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


  constructor(
    private functions: FunctionsProvider,
    public navCtrl: NavController,
    private log: ActivityLoggerProvider,
    private cdRef:ChangeDetectorRef,
    private geolocationService: GeolocationServiceProvider,
    private restaurantService: RestaurantServiceProvider
  ) {
    this.geolocationService.toggleManualReload(true);

    this.locationSub = this.geolocationService.observableLocation.subscribe(location => {
      if(location.coords.length){
        this.userCoords = [location.coords[0], location.coords[1]];
        this.setDistances();
        if(this.geolocationService.manualReload){
          this.getRestaurants();
          this.geolocationService.toggleManualReload(false);
        }
      }
    });
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
    //update sortType for all purposes
    this.sortType = sortType;

    //sort restoAll by new sortType
    this.restoAll = _.sortBy(this.restoAll, (resto) => {
      if(this.sortType == 'alpha'){return resto['name']}
      if(this.sortType == 'distance'){return resto['distance']}
    });

    this.updateList()
  }

  navigateTo(restaurant, timeslotId){
    setTimeout(() => {
      this.log.sendRestoEvent('Restaurant Item Clicked', 'Search', restaurant.name, restaurant._id);
      this.navCtrl.push('RestaurantPage', {
        restaurant: JSON.stringify(restaurant),
        timeslotsData: JSON.stringify(restaurant.timeslots),
        businessHoursData: JSON.stringify(restaurant.businessHours),
        timeslotId: timeslotId,
        distance: restaurant.distanceFormatted,
        date: moment().format(),
        time: moment().add(30 - moment().minute() % 30, 'm').format()
      });
    }, 0)
  }
}
