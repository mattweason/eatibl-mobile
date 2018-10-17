import { Component, OnInit, trigger } from '@angular/core';
import {IonicPage, NavController, NavParams, AlertController, ModalController, Platform, Events} from 'ionic-angular';
import { Validators, FormBuilder, FormGroup } from '@angular/forms';
import { ApiServiceProvider } from "../../providers/api-service/api-service";
import { ActivityLoggerProvider } from "../../providers/activity-logger/activity-logger";
import { FunctionsProvider } from '../../providers/functions/functions';
import { Storage } from '@ionic/storage';
import * as decode from 'jwt-decode';
import { Device } from '@ionic-native/device';
import { LocalNotifications } from '@ionic-native/local-notifications';
import moment from 'moment';

import { BookingConfirmedPage } from '../../pages/booking-confirmed/booking-confirmed';

import {Facebook} from "@ionic-native/facebook";

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
    phone: '',
    type: '',
    facebook_id: '',
    google_id: '',
    active: 0
  };
  restaurant: any;
  timeslot: any;
  notificationData: any;
  people: any;
  timeOfBooking: any;
  dateObject = {} as any;
  date: any;
  response: any;
  bookingForm: FormGroup;
  postObject = {} as any;
  notificationId = Math.floor(1000 + Math.random() * 9000);

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
      phone: [
        '', Validators.compose([
          Validators.required,
          Validators.pattern('[0-9 ()+-]*')
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

    // this.scheduleNotification();
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad ConfirmBookingPage');
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

    //Schedule notification
    this.localNotifications.schedule({
      id: this.notificationId,
      trigger: {at: new Date(moment(triggerTime).format())},
      text: "We noticed you were interested in trying out "+this.restaurant.name+". If you book today you can get up to "+recommendedTimeslot.discount+"% off dine in or take out!",
      title: "Get "+recommendedTimeslot.discount+"% off today at "+this.restaurant.name+"!",
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
  }

  //Gather user information from local storage
  getUserInfo(){
    this.storage.get('eatiblUser').then((val) => {
      if(val){
        this.user = decode(val);
        if(this.user.phone || this.user.active){
          this.log.sendEvent('User Already Exists', 'Confirm Booking', JSON.stringify(this.user));
          this.bookingForm.controls['name'].setValue(this.user.name);
          if(this.user.phone)
            this.bookingForm.controls['phone'].setValue(this.user.phone);
          this.bookingForm.controls['email'].setValue(this.user.email);
          this.bookingForm.controls['active'].setValue(this.user.active);
          this.bookingForm.controls['_id'].setValue(this.user._id);
          if(this.user.facebook_id)
            this.bookingForm.controls['facebook_id'].setValue(this.user.facebook_id);
          if(this.user.google_id)
            this.bookingForm.controls['google_id'].setValue(this.user.google_id);
        }
      }
    });
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
      //Clean up phone number
      this.bookingForm.value.phone = this.bookingForm.value.phone.replace(/\D/g,''); //Strip all non digits
      this.bookingForm.value.phone = this.bookingForm.value.phone.replace(/^1/, ''); //Strip the leading 1
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
        phone: this.bookingForm.value.phone,
        email: this.bookingForm.value.email,
        deviceId: this.device.uuid
      };

      //Run the check to see if this user has been verified
      if(!this.user.facebook_id || !this.user.google_id)
        this.API.makePost('user/verify/check', postObj).subscribe(response => {
          this.log.sendEvent('Confirm Booking: Try Validate', 'Confirm Booking', JSON.stringify(postObj));
          if(response['err']){ //Twilio says invalid phone number
            let title = 'Invalid Phone Number',
              message = 'The number you have entered is incorrect. Please ensure you have entered an accurate, North American phone number.';
            this.presentAlert(title, message);

          } else { //Phone number is good
            if (response['verify']) //Has not been verified
              this.verifyAlert(false);

            else
              this.createBooking(); //Good to go
          }

        });
      else
        this.createBooking();
    }
  }

  //Verification code alert
  verifyAlert(reverify){ //If reverify is true, the user entered a bad code and must reverify
    this.log.sendRestoEvent('Confirm Booking: Verification Requested', 'Confirm Booking', 'Reverify: '+reverify, this.restaurant._id);
    let title = 'Verify Phone Number',
      message = "We've texted you a verification code. Please enter the code below to complete the booking.";
    if(reverify){
      title = 'Invalid Code';
      message = "The verification code you entered does not match the one sent to you. Please try again.";
    }
    let alert = this.alertCtrl.create({
      title: title,
      message: message,
      inputs: [
        {
          name: 'code',
          placeholder: 'Code',
          type: 'tel'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          handler: data => {
            console.log('Cancel clicked');
          }
        },
        {
          text: 'Submit',
          handler: data => {
            if(data.code){
              const postObj = {
                phone: this.bookingForm.value.phone,
                code: data.code
              };
              this.API.makePost('user/verify/confirm', postObj).subscribe(response => {

                this.log.sendRestoEvent('Confirm Booking: Verification Success', 'Confirm Booking', JSON.stringify(postObj), this.restaurant._id);
                if(response['confirmed']) //Code is good :)
                  this.createBooking();

                else { //Code is bad :(
                  this.verifyAlert(true);
                }
              });
            }
          }
        }
      ]
    });
    alert.present();
  }

  //Create the booking
  createBooking(){
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

        var currentDate = moment();
        var bookingDate = moment(this.date);

        //add booking time to the booking date (by default booking date only tracks the calendar days)
        var minute = this.timeslot.time % 1 * 60;
        var hour = minute ? this.timeslot.time - 0.5 : this.timeslot.time; //if we have 30 minutes, remove 0.5 from timeslot value
        bookingDate.set({h: hour, m: minute, s:0});

        //calculate the number of hours between now and booking
        var timeDiff = bookingDate.diff(currentDate, 'minutes')/60;

        if(this.platform.is('cordova')) { //Don't run in ionic lab, causes error

          //TEST TEST TEST... 123 TESTING
          // this.localNotifications.schedule({
          //   id: 50, //a number from 0 to 10000
          //   title: "This is a test",
          //   text: "Your booking for " + this.restaurant.name + " is in an hour!",
          //   data: {type: "Reminder", details: this.response.booking}, //Send information to navigate to booking confirmed page
          //   icon: 'file://assets/imgs/notification-icon.png'
          // });

          //REMINDER: When booking is made with less than 2hr lead time
          if(timeDiff < 2){
            this.localNotifications.schedule({
              id: this.postObject.localNotifications.reminderId, //a number from 0 to 10000
              title: "Reminder",
              text: "Your booking for " + this.restaurant.name + " is in 15 minutes!",
              trigger: {at: (bookingDate.subtract(15, 'minutes')).toDate()},
              data: {type: "Reminder", details: this.response.booking}, //Send information to navigate to booking confirmed page
              icon: 'file://assets/imgs/notification-icon.png'
            });
            this.log.sendRestoEvent('Reminder Notification Scheduled', 'Confirm Booking', 'User booked with less than 2hr lead time', this.restaurant._id);
          }

          //REMINDER: When booking is more than 2hr lead time
          if(timeDiff >= 2){
            this.localNotifications.schedule({
              id: this.postObject.localNotifications.reminderId, //a number from 0 to 10000
              title: "Reminder",
              text: "Your booking for " + this.restaurant.name + " is in an hour!",
              trigger: {at: (bookingDate.subtract(60, 'minutes')).toDate()},
              data: {type: "Reminder", details: this.response.booking}, //Send information to navigate to booking confirmed page
              icon: 'file://assets/imgs/notification-icon.png'
            });
            this.log.sendRestoEvent('Reminder Notification Scheduled', 'Confirm Booking', 'User booked with greater than 2hr lead time', this.restaurant._id);
          }

          //FEEDBACK: 3hrs after the booking is complete
          // this.localNotifications.schedule({
          //   id: this.postObject.localNotifications.feedbackId, //a number from 0 to 10000
          //   text: "How was your experience using Eatibl at" + this.restaurant.name + "?",
          //   trigger: {at: (bookingDate.add(180, 'minutes')).toDate()},
          //   data: {type: "Feedback", details: this.response.booking}, //Send information to navigate to booking confirmed page
          //   icon: 'https://eatibl.com/assets/images/notification-icon.png'
          // });

        }

        this.storage.get('eatiblUser').then((val) => {
          if(val){
            this.user = decode(val);
            this.log.sendRestoEvent('Create Booking: Success', 'Confirm Booking', 'Previous user data: '+JSON.stringify(this.user) || "none", this.restaurant._id);
            if(!this.user.phone)
              this.storage.set('eatiblUser', this.response.token)
          }
          else{
            this.storage.set('eatiblUser', this.response.token)
            this.events.publish('email:captured');
            this.log.sendRestoEvent('Create Booking: Success', 'Confirm Booking', 'Previous user data: '+JSON.stringify(decode(this.response.token)) || "none", this.restaurant._id);
          }
        });

        this.logFacebookEvent('Booking', this.restaurant._id);

        if(this.response.booking.people > 1){
          const inviteModal = this.modal.create('InviteModalPage', { type: 'reminder', booking: this.response.booking, restaurant: this.restaurant });
          inviteModal.onDidDismiss(() => {
            this.navCtrl.push('BookingConfirmedPage', {
              booking: this.response.booking,
              restaurant: this.restaurant
            }).then(() => {
              var index = this.navCtrl.getActive().index;
              this.navCtrl.remove(index-1);
            });
          });
          inviteModal.present();
        }
        else{
          this.navCtrl.push('BookingConfirmedPage', {
            booking: this.response.booking,
            restaurant: this.restaurant,
            inviteModal: true
          }).then(() => {
            var index = this.navCtrl.getActive().index;
            this.navCtrl.remove(index-1);
          });
        }
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
    let alert = this.alertCtrl.create({
      title: title,
      message: message,
      buttons: ['Dismiss']
    });
    alert.present();
  }

  //Error alert for booking errors
  presentAlertWithLogin(title, message){
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
