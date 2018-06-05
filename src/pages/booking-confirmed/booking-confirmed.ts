import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, AlertController } from 'ionic-angular';
import { ApiServiceProvider } from "../../providers/api-service/api-service";
import { LaunchNavigator, LaunchNavigatorOptions } from '@ionic-native/launch-navigator';
import { Events } from 'ionic-angular';
import moment from 'moment';

import { FunctionsProvider } from '../../providers/functions/functions';

/**
 * Generated class for the BookingConfirmedPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-booking-confirmed',
  templateUrl: 'booking-confirmed.html',
})
export class BookingConfirmedPage {
  restaurant: any;
  booking: any;
  dateObject = {} as any;
  response: any;
  upcoming = false;
  tooClose = false;
  withinTime = false; //Is true if current time is within 30 minute before or 2hrs after start of timeslo
  withinDistance = false; //Is true if current location is within 100 meters of the restaurant
  location: any;
  redeemed = false;
  distance: any;
  canRedeem = false;
  mapUrl: any;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private functions: FunctionsProvider,
    private API: ApiServiceProvider,
    public alertCtrl: AlertController,
    private launchNavigator: LaunchNavigator,
    public events: Events
    ) {
      this.restaurant = navParams.get('restaurant');
      this.booking = navParams.get('booking');
      console.log(this.booking)
      this.buildDateObject();
      events.subscribe('user:geolocated', (location, time) => {
        this.location = location;
        this.checkLocation();
      });
    this.buildMap();
    }

  //Build static map url
  buildMap(){
    // this.mapUrl = "https://maps.googleapis.com/maps/api/staticmap?size=600x340&maptype=roadmap&markers=color:blue%7Clabel:S%7C40.702147,-74.015794&key=AIzaSyD3lkVR2f_hCqSF_7Zpj4kUIAwlqLf1uao"
    this.mapUrl = "https://maps.googleapis.com/maps/api/staticmap?size=600x340&maptype=roadmap&markers=icon:https://eatibl.com/assets/images/eatibl-pin.png|"+this.restaurant.latitude+","+this.restaurant.longitude;
  }

  //Open the users relevant maps app to navigate to the restaurant
  openMaps(){
    this.launchNavigator.navigate(this.restaurant.address);
  }

  ionViewDidLoad(){
    //Call geolocation from app.component
    this.events.publish('get:geolocation', Date.now());
    if(this.booking.redeemed)
      this.redeemed = true;
  }

  buildDateObject(){
    var dateOrigin = new Date(this.booking.date);
    var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    var months = ['Jan.','Feb.','Mar.','Apr.','May','Jun.','Jul.','Aug.','Sep.','Oct.','Nov.','Dec.'];
    var day = days[dateOrigin.getDay()];
    var date = dateOrigin.getDate();
    var month = months[dateOrigin.getMonth()];
    this.dateObject.month = month;
    this.dateObject.date = date;
    this.dateObject.day = day;
    this.checkTime();
  }

  cancelBooking(){
    if(!this.tooClose){
      let alert = this.alertCtrl.create({
        title: 'Cancel Booking',
        message: 'Are you sure you want to cancel this booking?',
        buttons: [
          {
            text: 'No',
            role: 'cancel',
            handler: () => {
              console.log('Cancel clicked');
            }
          },
          {
            text: 'Yes',
            handler: () => {
              this.API.makeCall('booking/'+this.booking._id+'/disable').subscribe(response => {
                this.response = response;
                if(this.response.message == 'error')
                  this.errorAlert();
                if(this.response.disabled == 1)
                  this.successAlert();
              });
            }
          }
        ]
      });
      alert.present();
    }
    else{
      let alert = this.alertCtrl.create({
        title: 'Cannot Cancel',
        message: "You cannot cancel a booking within 30 minutes of it's start time.",
        buttons: [
          {
            text: 'Ok',
            role: 'cancel',
            handler: () => {
              console.log('Ok clicked');
            }
          }
        ]
      });
      alert.present();
    }
  }

  errorAlert(){
    let alert = this.alertCtrl.create({
      title: 'Error',
      subTitle: 'Sorry, there was an error cancelling your booking. Please try again.',
      buttons: ['Dismiss']
    });
    alert.present();
  }

  successAlert(){
    let alert = this.alertCtrl.create({
      title: 'Booking Cancelled',
      subTitle: 'Your booking at '+this.restaurant.name+' was successfully cancelled.',
      buttons: [{
        text: 'Dismiss',
        handler: () => {
          this.navCtrl.pop();
        }
      }]
    });
    alert.present();
  }

  cannotRedeemAlert(){
    let alert = this.alertCtrl.create({
      title: "Can't Redeem",
      subTitle: 'You must be at the restaurant and near the time of your booking to redeem.',
      buttons: ['Dismiss']
    });
    alert.present();
  }

  alreadyRedeemedAlert(){
    let alert = this.alertCtrl.create({
      title: "Already Redeemed",
      subTitle: 'You have already redeemed this booking.',
      buttons: ['Dismiss']
    });
    alert.present();
  }

  redeemBooking(){
    if(!this.redeemed){
      this.checkLocation();
      this.checkTime();
      if(this.withinTime && this.withinDistance){
        var redeemObject = {
          restoLat: this.restaurant.latitude,
          restoLon: this.restaurant.longitude,
          userLat: this.location.coords.latitude,
          userLong: this.location.coords.longitude,
          distance: this.distance,
          timestamp: moment()
        };
        this.API.makePost('booking/'+this.booking._id+'/redeem', redeemObject).subscribe(response => {
          this.response = response;
          if(this.response.message == 'error')
            this.errorAlert();
          if(this.response.redeemed)
            this.redeemed = true;
        });
      }
      else
        this.cannotRedeemAlert();
    }
    else{
      this.alreadyRedeemedAlert();
    }
  }

  //Confirm a user is within the vicinity of the restaurant
  checkLocation(){
    if(this.location){
      this.distance = this.functions.getDistanceFromLatLonInKm(this.location.coords.latitude, this.location.coords.longitude, this.restaurant.latitude, this.restaurant.longitude);
      if(this.distance < 0.1) //Distance is returned in km must be within 100m or 0.1km
        this.withinDistance = true;
    }
  }

  checkTime(){
    var date = moment(this.booking.date).format('L');
    var time = this.functions.formatClockTime(this.booking.time, true);
    var datetime = moment(date+" "+time);
    this.upcoming = moment().isBefore(datetime);
    this.tooClose = !moment().add(30, 'minutes').isBefore(datetime);
    this.withinTime = (moment().add(30, 'minutes').isAfter(datetime) && moment().isBefore(moment(datetime).add(2, 'hours')));
  }

}
