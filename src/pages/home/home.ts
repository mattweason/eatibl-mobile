import { Component, ViewChild, OnInit } from '@angular/core';
import { IonicPage, NavController, Content } from 'ionic-angular';
import { ApiServiceProvider } from "../../providers/api-service/api-service";
import { Events } from 'ionic-angular';
import * as moment from 'moment'

@IonicPage()
@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {
  @ViewChild(Content) content: Content;

  restaurantList: any;
  bookings = [];
  date: string;
  today: string;
  maxDate: string;
  time: any;
  showToolbar: boolean = true;
  location: any;
  userCoords: any;
  firstCall = true;
  batch = 0; //Represents the batch number
  count = 0; //Stores the total number of restaurants to compare to current restaurant list
  allResults = false; //Becomes true when we've retrieved all of the restaurants

  constructor(public navCtrl: NavController, private API: ApiServiceProvider, public events: Events) {
    this.setNow();
    events.subscribe('user:geolocated', (location, time) => {
      this.location = location;
      this.userCoords = [this.location.coords.latitude, this.location.coords.longitude];

      //Only request the geolocated restaurant list the first time this event is received
      if(this.firstCall){
        this.firstCall = false;
        this.API.makePost('restaurant/all/geolocated/' + this.batch, this.userCoords).subscribe(data => {
          this.batch++;
          this.count = data['count'];
          this.restaurantList = data['restaurants'];
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

  //Pull down to refresh the restaurant list
  doRefresh(refresher){
    this.events.publish('get:geolocation', Date.now()); //Tell the app.component we need the latest geolocation
    this.batch = 0; //Reset batch number to 0
    this.API.makePost('restaurant/all/geolocated/' + this.batch, this.userCoords).subscribe(data => {
      this.restaurantList = data;
      refresher.complete();
    });
  }

  //Call next batch of 10 restaurants when you reach the bottom of the page
  getNextBatch(infiniteScroll){
    this.API.makePost('restaurant/all/geolocated/' + this.batch, this.userCoords).subscribe(data => {
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

  toggleToolbar(){
    this.showToolbar = !this.showToolbar;
    this.content.resize();
  }

  setNow(){
    this.date = this.today = moment().format();
    this.time = moment().add(30 - moment().minute() % 30, 'm').format();
    this.maxDate = moment().add(30, 'day').format();
  }
}
