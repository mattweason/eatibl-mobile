import { Component, ViewChild, OnInit, ChangeDetectorRef } from '@angular/core';
import { IonicPage, NavController, NavParams, Events, Content } from 'ionic-angular';
import { ApiServiceProvider } from "../../providers/api-service/api-service";
import * as moment from 'moment';
import * as _ from 'underscore';

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
  @ViewChild(Content) content: Content;

  searchInput: string;
  restaurantList: any; //just the ones loaded
  restaurantAll: any; //entire list
  restaurantFiltered: any; //filtered search results
  dataCache: any; //Cache the api return
  bookings = [];
  date: string;
  today: string;
  maxDate: string;
  showToolbar: boolean = true;
  time: any;
  userCoords: any;
  batch = 0; //Represents the batch number
  count = 0; //Stores the total number of restaurants to compare to current restaurant list
  allResults = false; //Becomes true when we've retrieved all of the restaurants
  value = ''; //Store the search key words
  firstCall = true;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private API: ApiServiceProvider,
    private cdRef:ChangeDetectorRef,
    public events: Events
  ) {
    events.subscribe('user:geolocated', (location, time) => {
      this.userCoords = location;

      //Only request the geolocated restaurant list the first time this event is received
      if(this.firstCall){
        this.firstCall = false;
        this.API.makePost('restaurant/all/geolocated/', this.userCoords).subscribe(data => {
          this.dataCache = data;
          this.setNow(true);
          this.cdRef.detectChanges();
        });
      }
    });
  }

  ionViewDidLoad() {
    //Call geolocation from app.component
    this.events.publish('get:geolocation', Date.now());
  }

  ionViewDidEnter(){
    this.events.publish('loaded:restaurant'); //Tell restaurant cards to rerun timeslots and businesshours processes
  }

  //Fires when the home page tab is selected and is already active
  ionSelected() {
    this.content.scrollToTop();
  }

  setNow(initialCall){
    if(this.date != this.today || initialCall){
      this.date = this.today = moment().format();
      this.time = moment().add(30 - moment().minute() % 30, 'm').format();
      this.maxDate = moment().add(30, 'day').format();
      this.rankRestaurants(this.dataCache);
    }
  }

  //Ranking system to dictate order of display
  rankRestaurants(restaurantList){
    var day = moment(this.date).format('dddd'); //eg "Monday", "Tuesday"
    var hour = (parseInt(moment().format('k')) + (parseInt(moment().format('m')) / 60));

    for (var i = 0; i < restaurantList.length; i++){
      var rank = 100; //start with default value
      var timeslots = _.filter(restaurantList[i].timeslots, function(timeslot){
        return timeslot.day == day && timeslot.time >= hour;
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
      if(restaurantList[i].distance <= 1)
        rank = rank + 1/restaurantList[i].distance;
      else if(restaurantList[i].distance >= 3 && restaurantList[i].distance <= 10)
        rank = rank - restaurantList[i].distance/2;
      else if(restaurantList[i].distance > 10)
        rank = rank - 6;

      restaurantList[i].rank = rank; //SET RANKING
    }

    //sort list by rankings
    restaurantList = _.sortBy(restaurantList, function(resto){
      return -resto.rank;
    });

    this.restaurantAll = restaurantList; //store all restos
    this.restaurantFiltered = restaurantList; //initial filtered list is the full restaurant list
    this.restaurantList = this.restaurantFiltered.slice(0,10); //load first 10
    this.batch++;
  }

  //Currently filters based on restaurant name and categories
  filterRestaurants(searchInput){
    this.allResults = false;
    this.batch = 0;
    this.value = searchInput ? searchInput.toLowerCase() : ''; //Don't do toLowerCase of undefined
    var search = this.value.split(" "); //contain array of search keywords

    for (var i = 0; i < search.length; i++){
      search[i] = search[i].trim();//remove any extra spaces from each search keyword
    }

    //filter list
    this.restaurantFiltered = _.filter(this.restaurantAll, function(resto){
      for (var i = 0; i < search.length; i++) {
        if (resto.name.toLowerCase().indexOf(search[i]) > -1)
          return true;

        //if restaurant has categories
        if(resto.categories)
          for(var x = 0; x < resto.categories.length; x++){
            if (resto.categories[x].toLowerCase().indexOf(search[i]) > -1)
              return true;
          }
      }
      //if nothing matches, you're outttaa heeerreee!
      return false;
    });

    this.restaurantList = this.restaurantFiltered.slice(0,10); //load first 10
    this.batch++;
  }

  //Rank restaurants and filter them when date is changed and keyword search is active
  rankAndFilter(searchInput){

  }

  //Call next batch of 10 restaurants when you reach the bottom of the page
  getNextBatch(infiniteScroll){
    var limit = Math.min(this.batch*10+10, this.restaurantFiltered.length);

    for(var i = this.batch*10; i < limit; i++){
      this.restaurantList.push(this.restaurantFiltered[i]);
    }

    this.batch++;

    if(this.restaurantList.length == this.restaurantFiltered.length)
      this.allResults = true;

    infiniteScroll.complete();
  }
}
