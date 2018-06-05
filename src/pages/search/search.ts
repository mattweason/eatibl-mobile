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
  restaurantList: any;
  bookings = [];
  date: string;
  today: string;
  maxDate: string;
  showToolbar: boolean = true;
  time: any;
  location: any;
  userCoords: any;
  batch = 0; //Represents the batch number
  count = 0; //Stores the total number of restaurants to compare to current restaurant list
  allResults = false; //Becomes true when we've retrieved all of the restaurants
  value = ''; //Store the search key words

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private API: ApiServiceProvider,
    public events: Events) {
      this.setNow();
      events.subscribe('user:geolocated', (location, time) => {
        this.location = location;
        this.userCoords = [this.location.coords.latitude, this.location.coords.longitude];

        var postObject = {
          search: this.value,
          location: this.userCoords
        };

        this.API.makePost('restaurant/search/' + this.batch, postObject).subscribe(data => {
          this.batch++;
          this.restaurantList = data['restaurants'];
        });
      });
  }

  ionViewDidLoad() {
    //Call geolocation from app.component
    this.events.publish('get:geolocation', Date.now());
  }

  ngOnInit(){
  }

  setNow(){
    this.date = this.today = moment().format();
    this.time = moment().add(30 - moment().minute() % 30, 'm').format();
    this.maxDate = moment().add(30, 'day').format();
  }

  //Currently filters based on restaurant name and categories
  filterRestaurants(searchInput){
    this.allResults = false;
    this.batch = 0;
    this.value = searchInput ? searchInput.toLowerCase() : ''; //Don't do toLowerCase of undefined

    var postObject = {
      search: this.value,
      location: this.userCoords
    };

    this.API.makePost('restaurant/search/' + this.batch, postObject).subscribe(data => {
      this.batch++;
      this.restaurantList = data['restaurants'];
    });
  }

  //Call next batch of 10 restaurants when you reach the bottom of the page
  getNextBatch(infiniteScroll){
    var postObject = {
      search: this.value,
      location: this.userCoords
    };

    this.API.makePost('restaurant/search/' + this.batch, postObject).subscribe(data => {
      this.batch++;
      this.count = data['count'];
      for(var i = 0; i < data['restaurants'].length; i++){ //Append results to restaurant list
        this.restaurantList.push(data['restaurants'][i]);
      }
      if(this.restaurantList.length >= this.count)
        this.allResults = true;
      infiniteScroll.complete();
    });
  }
}
