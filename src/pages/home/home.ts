import { Component, ViewChild, OnInit } from '@angular/core';
import { NavController, Content } from 'ionic-angular';
import { ApiServiceProvider } from "../../providers/api-service/api-service";
import * as moment from 'moment'

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

  constructor(public navCtrl: NavController, private API: ApiServiceProvider) {
    this.setNow();
  }

  ngOnInit(){
    this.API.makeCall('restaurant/all').subscribe(data => this.restaurantList = data);
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
