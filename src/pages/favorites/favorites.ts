import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { GeolocationServiceProvider } from '../../providers/geolocation-service/geolocation-service';
import {UserServiceProvider} from "../../providers/user-service/user-service";
import * as moment from 'moment';
import * as _ from 'underscore';
import {Subscription} from "rxjs";
import {ActivityLoggerProvider} from "../../providers/activity-logger/activity-logger";

/**
 * Generated class for the FavoritesPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-favorites',
  templateUrl: 'favorites.html',
})
export class FavoritesPage {

  private locationSub: Subscription;

  date: string;
  time: any;
  userCoords = [];
  locationText = 'Yonge & Dundas';
  user: any;
  userData: any;
  allRestos = [] as any;
  loadingRestaurants = true;

  constructor(
    public navCtrl: NavController,
    private userService: UserServiceProvider,
    private geolocationService: GeolocationServiceProvider,
    private log: ActivityLoggerProvider,
    public navParams: NavParams
  ) {
    //Set time and date
    this.date = this.time = moment().format();

    //Set user and userdata
    this.user = this.userService.user;
    this.userData = this.userService.userData;

    if(this.userData.starredRestos)
      this.rankRestaurants(this.userData.starredRestos);
    else
      this.loadingRestaurants = false;

    //Set userCoords
    this.locationSub = this.geolocationService.observableLocation.subscribe(location => {
      if(location){ //Sometimes on iOS location is undefined
        if(location.coords.length){
          this.userCoords = [location.coords[0], location.coords[1]];
          this.locationText = location['text'];
        }
      }
    });
  }

  ionViewDidEnter(){
    if(this.userData.starredRestos)
      this.rankRestaurants(this.userData.starredRestos);
    else
      this.loadingRestaurants = false;
  }

  //Ranking system to dictate order of display
  rankRestaurants(restaurantList){
    var day = moment(this.date).format('dddd'); //eg "Monday", "Tuesday"
    var today = moment().format('dddd'); //today's day in same format as above
    var hour = (parseInt(moment().format('k')) + (parseInt(moment().format('m')) / 60));

    for (var i = 0; i < restaurantList.length; i++){
      var timeslots = _.filter(restaurantList[i].timeslots, function(timeslot){

        if(today == day) //for today filter out spots that have already passed
          return timeslot.day == day && timeslot.time >= hour;
        else //for other days, show all available timeslots
          return timeslot.day == day;
      });

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
    }

    //sort list by rankings
    this.allRestos = _.sortBy(restaurantList, function(resto){
      return resto.name;
    });

    this.loadingRestaurants = false;
  }

  //Open login page
  login(){
    this.log.sendEvent('Login: Initiated', 'Favourites', 'User pressed login button');
    this.navCtrl.push('LoginPage');
  }

  //Pull down to refresh the restaurant list
  doRefresh(refresher){
    this.log.sendEvent('Favorite View: Refreshed', 'Home', 'User refreshed their favorites list');
    this.rankRestaurants(this.userData.starredRestos);
    refresher.complete();
  }

  ionViewDidLoad() {

  }

}
