import { Component, OnInit, trigger } from '@angular/core';
import {IonicPage, NavController, NavParams, AlertController, ModalController, Platform} from 'ionic-angular';
import { Validators, FormBuilder, FormGroup } from '@angular/forms';
import { ApiServiceProvider } from "../../providers/api-service/api-service";
import { ActivityLoggerProvider } from "../../providers/activity-logger/activity-logger";
import { Storage } from '@ionic/storage';
import * as decode from 'jwt-decode';
import { Device } from '@ionic-native/device';
import { LocalNotifications } from '@ionic-native/local-notifications';
import moment from 'moment';

import { BookingConfirmedPage } from '../../pages/booking-confirmed/booking-confirmed';

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
    phone: '',
    type: '',
    active: 0
  };
  restaurant: any;
  timeslot: any;
  people: any;
  timeOfBooking: any;
  dateObject = {} as any;
  date: any;
  response: any;
  bookingForm: FormGroup;
  postObject = {} as any;

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
    public localNotifications: LocalNotifications
  ) {
    this.restaurant = navParams.get('restaurant');
    this.timeslot = navParams.get('timeslot');
    this.people = navParams.get('people');
    this.date = navParams.get('date');

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
      _id: ['']
    });
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad ConfirmBookingPage');
  }

  ionViewDidEnter(){
    this.storage.get('eatiblUser').then((val) => {
      if(val){
        this.log.sendEvent('User Already Exists', 'Confirm Booking', JSON.stringify(this.user));
        this.user = decode(val);
        this.bookingForm.controls['name'].setValue(this.user.name);
        this.bookingForm.controls['phone'].setValue(this.user.phone);
        this.bookingForm.controls['email'].setValue(this.user.email);
        this.bookingForm.controls['active'].setValue(this.user.active);
        this.bookingForm.controls['_id'].setValue(this.user._id);
      } else { //
        this.user = {
          _id: '',
          email: '',
          name: '',
          phone: '',
          type: '',
          active: 0
        }
      }
    });
  }

  ngOnInit(){
    this.buildDateObject();
    this.storage.get('eatiblUser').then((val) => {
      if(val){
        this.user = decode(val);
        this.log.sendEvent('User Already Exists', 'Confirm Booking', JSON.stringify(this.user));
        this.bookingForm.controls['name'].setValue(this.user.name);
        this.bookingForm.controls['phone'].setValue(this.user.phone);
        this.bookingForm.controls['email'].setValue(this.user.email);
        this.bookingForm.controls['active'].setValue(this.user.active);
        this.bookingForm.controls['_id'].setValue(this.user._id);
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
    this.log.sendEvent('Confirm Booking: Initiated', 'Confirm Booking', JSON.stringify(this.bookingForm.value));
    if(!this.bookingForm.valid) {
      this.log.sendEvent('Confirm Booking: Invalid', 'Confirm Booking', JSON.stringify(this.bookingForm.value));
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
    }
  }

  //Verification code alert
  verifyAlert(reverify){ //If reverify is true, the user entered a bad code and must reverify
    this.log.sendEvent('Confirm Booking: Verification Requested', 'Confirm Booking', 'Reverify: '+reverify);
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

                this.log.sendEvent('Confirm Booking: Verification Success', 'Confirm Booking', JSON.stringify(postObj));
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
    this.log.sendEvent('Create Booking: Initiated', 'Confirm Booking', JSON.stringify(this.postObject));
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

        this.log.sendEvent('Create Booking: Response', 'Confirm Booking', 'Response Message: '+this.response.message);

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
            this.log.sendEvent('Reminder Notification Scheduled', 'Confirm Booking', 'User booked with less than 2hr lead time');
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
            this.log.sendEvent('Reminder Notification Scheduled', 'Confirm Booking', 'User booked with greater than 2hr lead time');
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
            this.log.sendEvent('Create Booking: Success', 'Confirm Booking', 'Previous user data: '+JSON.stringify(this.user) || "none");
          }
          else{
            this.storage.set('eatiblUser', this.response.token)
            this.log.sendEvent('Create Booking: Success', 'Confirm Booking', 'Previous user data: '+JSON.stringify(decode(this.response.token)) || "none");
          }
        });
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
