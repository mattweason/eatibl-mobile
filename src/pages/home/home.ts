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

  constructor(public navCtrl: NavController, private API: ApiServiceProvider, public events: Events) {
    this.setNow();
    events.subscribe('user:geolocated', (location, time) => {
      this.location = location;
    });
  }

  ngOnInit(){
    this.API.makeCall('restaurant/all').subscribe(data => this.restaurantList = data);
  }

  ionViewDidEnter(){
    //Call geolocation from app.component
    this.events.publish('get:geolocation', Date.now());
  }

  doRefresh(refresher){
    this.API.makeCall('restaurant/all').subscribe(data => {
      this.restaurantList = data
      refresher.complete();
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
