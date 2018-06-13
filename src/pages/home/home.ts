import { Component, ViewChild, OnInit, ChangeDetectorRef } from '@angular/core';
import { IonicPage, NavController, Content } from 'ionic-angular';
import { ApiServiceProvider } from "../../providers/api-service/api-service";
import { Events } from 'ionic-angular';
import * as moment from 'moment';
import * as _ from 'underscore';

@IonicPage()
@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {
  @ViewChild(Content) content: Content;

  restaurantList: any; //just the ones loaded
  restaurantAll: any; //entire list
  dataCache: any; //Cache the api return
  bookings = [];
  date: string;
  today: string; //sets the minimum of the date picker
  maxDate: string;
  time: any;
  showToolbar: boolean = true;
  location: any;
  userCoords: any;
  firstCall = true;
  batch = 0; //Represents the batch number
  allResults = false; //Becomes true when we've retrieved all of the restaurants

  constructor(
    public navCtrl: NavController,
    private API: ApiServiceProvider,
    private cdRef:ChangeDetectorRef,
    public events: Events
  ) {
    events.subscribe('user:geolocated', (location, time) => {
      this.location = location;
      this.userCoords = [this.location.coords.latitude, this.location.coords.longitude];

      //Only request the geolocated restaurant list the first time this event is received
      if(this.firstCall){
        this.firstCall = false;
        this.API.makePost('restaurant/all/geolocated/', this.userCoords).subscribe(data => {
          this.dataCache = data;
          this.setNow(true); //rankRestaurants runs inside here
          this.cdRef.detectChanges();
        });
      }
    });
  }

  ngOnInit(){
  }

  ionViewDidEnter(){
    //Call geolocation from app.component
    this.events.publish('get:geolocation', Date.now());
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

    this.restaurantList = restaurantList.slice(0,10); //load first 10
    this.restaurantAll = restaurantList; //store all restos
    this.batch++;
  }

  //Pull down to refresh the restaurant list
  doRefresh(refresher){
    this.events.publish('get:geolocation', Date.now()); //Tell the app.component we need the latest geolocation
    this.API.makePost('restaurant/all/geolocated/', this.userCoords).subscribe(data => {
      this.rankRestaurants(data);
      refresher.complete();
    });
  }

  //Call next batch of 10 restaurants when you reach the bottom of the page
  getNextBatch(infiniteScroll){
    var limit = Math.min(this.batch*10+10, this.restaurantAll.length);

    for(var i = this.batch*10; i < limit; i++){
      this.restaurantList.push(this.restaurantAll[i]);
    }

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
}
