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

  filterRestaurants(event){
    var value = event.target.value;

    if(value)
      this.restaurantListFiltered = this.restaurantListAll.filter((restaurant) => {
        if(restaurant.name != null) //Handle restaurants with null values
          return (restaurant.name.toLowerCase().indexOf(value.toLowerCase()) > -1);
        else
          return false;
      })
    else
      this.restaurantListFiltered = this.restaurantListAll;
  }
}
