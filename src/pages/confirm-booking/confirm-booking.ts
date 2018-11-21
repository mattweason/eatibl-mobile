import { Component } from '@angular/core';
import {IonicPage, NavController, NavParams, AlertController, ModalController, Platform, Events} from 'ionic-angular';
import { Validators, FormBuilder, FormGroup } from '@angular/forms';
import { Storage } from '@ionic/storage';
import { Device } from '@ionic-native/device';
import { LocalNotifications } from '@ionic-native/local-notifications';
import moment from 'moment';

import {Facebook} from "@ionic-native/facebook";

import {UserServiceProvider} from "../../providers/user-service/user-service";
import { ApiServiceProvider } from "../../providers/api-service/api-service";
import { ActivityLoggerProvider } from "../../providers/activity-logger/activity-logger";
import { FunctionsProvider } from '../../providers/functions/functions';

/**
 * Generated class for the ConfirmBookingPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-confirm-booking',
  templateUrl: 'confirm-booking.html',
})
export class ConfirmBookingPage {

  isLoggedIn = false;
  user = {
    _id: '',
    email: '',
    name: '',
    type: '',
    facebook_id: '',
    google_id: '',
    active: 0
  };
  restaurant: any;
  timeslot: any;
  notificationData: any;
  people: any;
  dateObject = {} as any;
  date: any;
  response: any;
  bookingForm: FormGroup;
  postObject = {} as any;
  processingBooking = false; //Disable confirm booking after being pressed once

  constructor(
    private platform: Platform,
    public navCtrl: NavController,
    public navParams: NavParams,
    private functions: FunctionsProvider,
    private API: ApiServiceProvider,
    public alertCtrl: AlertController,
    private formBuilder: FormBuilder,
    private device: Device,
    private storage: Storage,
    private modal: ModalController,
    private log: ActivityLoggerProvider,
    public localNotifications: LocalNotifications,
    private fb: Facebook,
    private userService: UserServiceProvider,
    public events: Events
  ) {
    this.restaurant = navParams.get('restaurant');
    this.timeslot = navParams.get('timeslot');
    this.people = navParams.get('people');
    this.date = navParams.get('date');
    this.notificationData = navParams.get('notificationData');

    //Form controls and validation
    this.bookingForm = this.formBuilder.group({
      name: [
        '', Validators.compose([
          Validators.required
        ])
      ],
      email: [
        '', Validators.compose([
          Validators.required,
          Validators.email
        ])
      ],
      active: [0],
      facebook_id: [''],
      google_id: [''],
      _id: ['']
    });

    this.scheduleNotification();
  }

  ionViewDidEnter(){
    this.getUserInfo();
  }

  ngOnInit(){
    this.buildDateObject();
    this.getUserInfo();
  }

  //Schedule a notification for tomorrow if the user doesn't complete the booking
  scheduleNotification(){
    var tomorrow = moment(this.date).add(1, 'days').format('dddd'),
        triggerTime = moment(this.date).add(1, 'days').hour(11).minute(0).second(0),
        recommendedTimeslot = {} as any;

    //Get timeslot next day with highest discount
    for(var i = 0; i < this.notificationData.allTimeslots.length; i++){

      //If no recommended timeslots yet, set to the first one from tomorrow
      if(!recommendedTimeslot.hasOwnProperty('discount') && this.notificationData.allTimeslots[i].day == tomorrow)
        recommendedTimeslot = this.notificationData.allTimeslots[i];

      //Replace current recommended timeslot with one with highest discount
      if(this.notificationData.allTimeslots[i].day == tomorrow && this.notificationData.allTimeslots[i].discount > recommendedTimeslot['discount'])
        recommendedTimeslot = this.notificationData.allTimeslots[i];
    }

    var notificationId = Math.floor(10000 + Math.random() * 90000);

    //Schedule notification
    this.localNotifications.cancel(4);
    this.localNotifications.schedule({
      id: 4,
      trigger: {at: new Date(moment(triggerTime).format())},
      text: "🍴 We noticed you were interested in trying out "+this.restaurant.name+". If you book today you can get up to "+recommendedTimeslot.discount+"% off dine in or take out!",
      title: "🔥 Get "+recommendedTimeslot.discount+"% off today at "+this.restaurant.name+"!",
      icon: 'res://notification_app_icon',
      smallIcon: "res://my_notification_icon",
      color: "#d8354d",
      data: {
        type: 'incomplete booking',
        restaurant: this.restaurant,
        timeslots: this.notificationData.allTimeslots,
        businessHours: this.notificationData.businessHours,
        date: moment(this.date).add(1, 'days').format(),
        time: moment(triggerTime).format(),
        distance: this.notificationData.distance
      }
    });

    this.functions.addNotification(notificationId, this.restaurant.name+': Booking Abandoned');
  }

  //Gather user information from local storage
  getUserInfo(){
    this.user = this.userService.user;
    if(this.user.email){
      this.bookingForm.controls['name'].setValue(this.user.name);
      this.bookingForm.controls['email'].setValue(this.user.email);
      this.bookingForm.controls['active'].setValue(this.user.active);
      this.bookingForm.controls['_id'].setValue(this.user._id);
      if(this.user.facebook_id)
        this.bookingForm.controls['facebook_id'].setValue(this.user.facebook_id);
      if(this.user.google_id)
        this.bookingForm.controls['google_id'].setValue(this.user.google_id);
    }
  }

  buildDateObject(){
    var dateOrigin = new Date(this.date);
    var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    var months = ['Jan.','Feb.','Mar.','Apr.','May','Jun.','Jul.','Aug.','Sep.','Oct.','Nov.','Dec.'];
    var day = days[dateOrigin.getDay()];
    var date = dateOrigin.getDate();
    var month = months[dateOrigin.getMonth()];
    this.dateObject.month = month;
    this.dateObject.date = date;
    this.dateObject.day = day;
  }

  //Trim the trailing spaces from form input values
  cleanValue(field){
    if(/\s+$/.test(this.bookingForm.value[field]))
      this.bookingForm.controls['email'].setValue(this.bookingForm.value.email.trim());
  }

  confirm(){
    this.log.sendRestoEvent('Confirm Booking: Initiated', 'Confirm Booking', JSON.stringify(this.bookingForm.value), this.restaurant._id);
    if(!this.bookingForm.valid) {
      this.log.sendRestoEvent('Confirm Booking: Invalid', 'Confirm Booking', JSON.stringify(this.bookingForm.value), this.restaurant._id);
      Object.keys(this.bookingForm.controls).forEach(field => { // {1}
        const control = this.bookingForm.get(field);            // {2}
        control.markAsTouched({onlySelf: true});       // {3}
      });
    }
    else{
      this.postObject = {
        user: this.bookingForm.value,
        people: this.people,
        timeslot: this.timeslot,
        date: this.date,
        deviceId: this.device.uuid,
        localNotifications: { //storing IDs of local notification, in case we cancel booking -> cancel notifications
          reminderId: Math.ceil(Math.random()*100000),
          feedbackId: Math.ceil(Math.random()*100000)
        }
      };

      //Create post object for verify check with deviceid
      let postObj = {
        name: this.bookingForm.value.name,
        email: this.bookingForm.value.email,
        deviceId: this.device.uuid
      };

      this.createBooking();
    }
  }

  //Create the booking
  createBooking(){
    this.processingBooking = true;
    this.log.sendRestoEvent('Create Booking: Initiated', 'Confirm Booking', JSON.stringify(this.postObject), this.restaurant._id);
    this.API.makePost('booking/' + this.restaurant._id + '/create', this.postObject).subscribe(response => {
      var title; //Used for error alerts
      var message; //Used for error alerts
      this.response = response;

      if(this.response.message){
        if(this.response.message == 'overcapacity'){ //If requested capacity is over the available capacity
          title = 'Overcapacity';
          message = 'Sorry, but this timeslot only has '+this.response.remaining+' seats left.';
        }

        if(this.response.message == 'user exists'){ //If the email address belongs to a registered account
          title = 'Email Address Taken';
          message = 'This email address belongs to a registered account. Please login or use a different email.';
          this.presentAlertWithLogin(title, message);
        }

        if(this.response.message == 'booking limit'){ //If the user has reached the booking limit
          title = 'Booking Limit';
          message = 'You already have 3 upcoming bookings and cannot make anymore.';
        }

        if(this.response.message == 'error'){ //If there was an error adding the user or the booking
          title = 'Error';
          message = 'Sorry, there was an error with your booking. Please try again.';
        }

        if(this.response.message == 'booking passed'){ //If the booking time is within 15 minutes of the timeslot or after the timeslot time
          title = 'Booking Passed';
          message = 'You must create your booking 15 minutes or more before the booking time.';
        }

        this.log.sendRestoEvent('Create Booking: Response', 'Confirm Booking', 'Response Message: '+this.response.message, this.restaurant._id);

        if(this.response.message != 'user exists') //If user exists we use presentAlertWithLogin
          this.presentAlert(title, message);
      }
      else{ //no response message means successful booking
        this.processingBooking = false;

        if(this.response.token)
          this.storage.set('eatiblUser', this.response.token);

        var currentDate = moment();
        var bookingDate = moment(this.date);

        //add booking time to the booking date (by default booking date only tracks the calendar days)
        var minute = this.timeslot.time % 1 * 60;
        var hour = minute ? this.timeslot.time - 0.5 : this.timeslot.time; //if we have 30 minutes, remove 0.5 from timeslot value
        bookingDate.set({h: hour, m: minute, s:0});

        //calculate the number of hours between now and booking
        var timeDiff = bookingDate.diff(currentDate, 'minutes')/60;

        if(this.platform.is('cordova')) { //Don't run in ionic lab, causes error

          //REMINDER: When booking is made with less than 2hr lead time
          var triggerTime = moment(this.date).add(30, 'seconds');
          if(timeDiff < 2){
            this.localNotifications.schedule({
              id: this.postObject.localNotifications.reminderId, //a number from 0 to 10000
              title: "🍴 Eatibl Booking Reminder",
              text: "⏱ Your booking for " + this.restaurant.name + " is in 15 minutes!",
              trigger: {at: (bookingDate.subtract(15, 'minutes')).toDate()},
              data: {type: "Reminder", booking: this.response.booking, restaurant: this.restaurant}, //Send information to navigate to booking confirmed page
              icon: 'res://notification_app_icon',
              smallIcon: "res://my_notification_icon",
              color: "#d8354d",
            });
            this.log.sendRestoEvent('Reminder Notification Scheduled', 'Confirm Booking', 'User booked with less than 2hr lead time', this.restaurant._id);
            this.functions.addNotification(this.postObject.localNotifications.reminderId, this.restaurant.name+': Reminder');
          }

          //REMINDER: When booking is more than 2hr lead time
          if(timeDiff >= 2){
            this.localNotifications.schedule({
              id: this.postObject.localNotifications.reminderId, //a number from 0 to 10000
              title: "🍴 Eatibl Booking Reminder",
              text: "⏱ Your booking for " + this.restaurant.name + " is in an hour!",
              trigger: {at: (bookingDate.subtract(60, 'minutes')).toDate()},
              data: {type: "Reminder", booking: this.response.booking, restaurant: this.restaurant}, //Send information to navigate to booking confirmed page
              icon: 'res://notification_app_icon',
              smallIcon: "res://my_notification_icon",
              color: "#d8354d",
            });
            this.log.sendRestoEvent('Reminder Notification Scheduled', 'Confirm Booking', 'User booked with greater than 2hr lead time', this.restaurant._id);
            this.functions.addNotification(this.postObject.localNotifications.reminderId, this.restaurant.name+': Reminder');
          }

          this.localNotifications.cancel(4);

        }

        this.logFacebookEvent('Booking', this.restaurant._id);

        //Present booking success and invite modal
        const inviteModal = this.modal.create('InviteModalPage', { type: 'reminder', booking: this.response.booking, restaurant: this.restaurant });
        inviteModal.onDidDismiss(() => {
          var index = this.navCtrl.getActive().index;
          this.navCtrl.remove(index-1).then(() => {
            this.events.publish('request:changeTab', 3);
          });
        });
        inviteModal.present();
      }
    });
  }

  //Don't make the booking and go back to the restaurant page
  cancel(){
    this.navCtrl.pop();
  }

  //send facebook event
  logFacebookEvent(eventName, restaurantID) {
    var params = {};
    params['RestaurantID'] = restaurantID;
    this.fb.logEvent(eventName, params, null);
  }

  //Error alert for booking errors
  presentAlert(title, message){
    this.processingBooking = false;
    let alert = this.alertCtrl.create({
      title: title,
      message: message,
      buttons: ['Dismiss']
    });
    alert.present();
  }

  //Error alert for booking errors
  presentAlertWithLogin(title, message){
    this.processingBooking = false;
    let alert = this.alertCtrl.create({
      title: title,
      message: message,
      buttons: [
        {
          text: 'Dismiss'
        },
        {
          text: 'Login',
          handler: data => {
            this.log.sendEvent('Login: Initiated', 'Confirm Booking', 'User pressed login button');
            this.navCtrl.push('LoginPage');
          }
        }
      ]
    });
    alert.present();
  }

  //Prompt terms of use / privacy policy modal
  openTermsModal(){
    const termsModal = this.modal.create('TermsModalPage');

    termsModal.present();
  }
}
