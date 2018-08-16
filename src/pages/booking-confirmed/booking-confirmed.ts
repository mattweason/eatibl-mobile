import { Component } from '@angular/core';
import {IonicPage, NavController, NavParams, AlertController, ModalController} from 'ionic-angular';
import { ApiServiceProvider } from "../../providers/api-service/api-service";
import { ActivityLoggerProvider } from "../../providers/activity-logger/activity-logger";
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
  showfeedback = false;
  feedback = {};

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private functions: FunctionsProvider,
    private API: ApiServiceProvider,
    public alertCtrl: AlertController,
    private launchNavigator: LaunchNavigator,
    public events: Events,
    private log: ActivityLoggerProvider,
    public modalCtrl: ModalController
    ) {
      //Collect nav parameters
      this.restaurant = navParams.get('restaurant');
      this.booking = navParams.get('booking');
      

      this.buildDateObject();
 
      //Subscribe to geolocation events from app.component
      events.subscribe('user:geolocated', (location, time) => {
        this.location = location;
        this.checkLocation();
      });

      //Build static map url
      this.mapUrl = "https://maps.googleapis.com/maps/api/staticmap?size=600x340&maptype=roadmap&markers=icon:https://eatibl.com/assets/images/eatibl-pin.png|"+this.restaurant.latitude+","+this.restaurant.longitude+"&key=AIzaSyAr99dcWf_ri92qrY7ZmcI54Uv0oaGXd2w";
    }

  //Open the users relevant maps app to navigate to the restaurant
  openMaps(){
    this.log.sendEvent('Get Directions', 'Booking Confirmed', 'User clicked on the navigate button below the map');
    this.launchNavigator.navigate(this.restaurant.address);
  }

  ionViewDidLoad(){
    //Call geolocation from app.component
    this.events.publish('get:geolocation', Date.now());
    if(this.booking.redeemed)
      this.redeemed = true;
    this.showFeedback()
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
    this.log.sendEvent('Cancel Booking: Attempted', 'Booking Confirmed', JSON.stringify(this.booking));
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
                this.log.sendEvent('Cancel Booking: Success', 'Booking Confirmed', JSON.stringify(this.booking));

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

      this.log.sendEvent('Cancel Booking: Failed', 'Booking Confirmed', JSON.stringify(this.booking));
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
    this.log.sendEvent('Redeem: Fail', 'Booking Confirmed', "Can't redeem because of time restriction");
    let alert = this.alertCtrl.create({
      title: "Can't Redeem",
      subTitle: 'You must be at the restaurant and near the time of your booking to redeem.',
      buttons: ['Dismiss']
    });
    alert.present();
  }

  alreadyRedeemedAlert(){
    this.log.sendEvent('Redeem: Already Redeemed', 'Booking Confirmed', JSON.stringify(this.booking));
    let alert = this.alertCtrl.create({
      title: "Already Redeemed",
      subTitle: 'You have already redeemed this booking.',
      buttons: ['Dismiss']
    });
    alert.present();
  }

  redeemBooking(){
    this.log.sendEvent('Redeem: Attempted', 'Booking Confirmed', JSON.stringify(this.booking));
    if(!this.redeemed){
      this.checkLocation();
      this.checkTime();
      if(this.withinTime){
        var redeemObject = {
          restoLat: this.restaurant.latitude,
          restoLon: this.restaurant.longitude,
          userLat: this.location ? this.location[0] : 0,
          userLong: this.location ? this.location[1] : 0,
          distance: this.distance || 0,
          timestamp: moment()
        };
        this.log.sendEvent('Redeem: Within Time Limits', 'Booking Confirmed', JSON.stringify(redeemObject));

        this.API.makePost('booking/'+this.booking._id+'/redeem', redeemObject).subscribe(response => {
          this.response = response;
          if(this.response.message == 'error')
            this.errorAlert();
          if(this.response.redeemed)
            this.redeemed = true;

          this.log.sendEvent('Redeem: Successful', 'Booking Confirmed', "Response Message from Server: "+JSON.stringify(this.response));
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
      this.distance = this.functions.getDistanceFromLatLonInKm(this.location[0], this.location[1], this.restaurant.latitude, this.restaurant.longitude);
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
    this.withinTime = (moment().add(30, 'minutes').isAfter(datetime) && moment().isBefore(moment(datetime).add(4, 'hours')));
  }

  showFeedback(){
    var baseMoment = moment();
    var timeOfBooking = baseMoment.startOf('day').add(this.booking.time, 'hours');
    var dateOfBooking = moment(moment(this.booking.date).format("LL")); //Find a way to fix ugly datetime->moment converting
    var bookingDateTime = dateOfBooking.hours(timeOfBooking.hours()).minutes(timeOfBooking.minutes())

    this.showfeedback = bookingDateTime.isBefore(moment().add(1, 'hour'))
  }

  sendFeedback(){
    //Define variables for the feedback model
    var user_id = this.booking.user_fid;
    var restaurant_id = this.booking.restaurant_fid;
    var rating = this.feedback['rating']
    var comments = this.feedback['comments']

    //Define Model
      let feedback = {
        rating: rating,
        restaurant_fid: restaurant_id,
        user_fid: user_id,
        comment: comments
    }

    this.API.makePost('user/feedback',feedback).subscribe(() => {});  

    let thankyoumodal = this.alertCtrl.create({
      title: "Feedback Sent!",
      subTitle: "Thanks for taking the time to send us some feedback.",
      buttons: ['dismiss']
    })

    thankyoumodal.present()
  }
}
