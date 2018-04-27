import { Component, OnInit } from '@angular/core';
import { IonicPage, NavController, NavParams, Events } from 'ionic-angular';
import { ApiServiceProvider } from "../../providers/api-service/api-service";
import * as moment from 'moment'

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
export class SearchPage implements OnInit {

  searchInput: string;
  restaurantListAll: any;
  restaurantListFiltered: any;
  bookings = [];
  date: string;
  today: string;
  maxDate: string;
  time: any;
  location: any;


  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private API: ApiServiceProvider,
    public events: Events) {
      this.setNow();
      events.subscribe('user:geolocated', (location, time) => {
        this.location = location;
      });
  }

  ionViewDidLoad() {
    //Call geolocation from app.component
    this.events.publish('get:geolocation', Date.now());
  }

  ngOnInit(){
    this.API.makeCall('restaurant/all').subscribe(data => this.restaurantListAll = this.restaurantListFiltered = data);
  }

  setNow(){
    this.date = this.today = moment().format();
    this.time = moment().add(30 - moment().minute() % 30, 'm').format();
    this.maxDate = moment().add(30, 'day').format();
  }

  doRefresh(refresher){
    this.API.makeCall('restaurant/all').subscribe(data => {
      this.restaurantListAll = this.restaurantListFiltered = data
      refresher.complete();
    });
  }

  //Currently filters based on restaurant name and categories
  filterRestaurants(event){
    var value = event.target.value.toLowerCase();

    if(value)
      this.restaurantListFiltered = this.restaurantListAll.filter((restaurant) => {
        if(restaurant.name.toLowerCase().indexOf(value) > -1) //First check for restaurant name
          return true;
        else if(restaurant.hasOwnProperty('categories')){ //Then check for restaurant categories
          for (var i = 0; i < restaurant.categories.length; i++){
            if(restaurant.categories[i].toLowerCase().indexOf(value) > -1)
            return true;
          }
        }
        else
          return false;
      });
    else //If search input is empty, return all restaurants
      this.restaurantListFiltered = this.restaurantListAll;
  }
}
