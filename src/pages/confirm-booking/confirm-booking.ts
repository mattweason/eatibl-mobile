import { Component, OnInit } from '@angular/core';
import {IonicPage, NavController, NavParams, AlertController, ModalController} from 'ionic-angular';
import { Validators, FormBuilder, FormGroup } from '@angular/forms';
import { ApiServiceProvider } from "../../providers/api-service/api-service";
import { Storage } from '@ionic/storage';
import * as decode from 'jwt-decode';
import { Device } from '@ionic-native/device';

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
  dateObject = {} as any;
  date: any;
  response: any;
  bookingForm: FormGroup;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private functions: FunctionsProvider,
    private API: ApiServiceProvider,
    public alertCtrl: AlertController,
    private formBuilder: FormBuilder,
    private device: Device,
    private storage: Storage,
    private modal: ModalController
  ) {
    this.restaurant = navParams.get('restaurant');
    this.timeslot = navParams.get('timeslot');
    this.people = navParams.get('people');
    this.date = navParams.get('date');

    //Form controls and validation
    this.bookingForm = this.formBuilder.group({
      name: [
        '', Validators.compose([
          Validators.required,
          Validators.pattern('[a-zA-Z][a-zA-Z ]+')
        ])
      ],
      phone: [
        '', Validators.compose([
          Validators.required,
          Validators.pattern('[0-9 ()+-]*'),
          Validators.maxLength(17)
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

  ngOnInit(){
    this.buildDateObject();
    this.storage.get('eatiblUser').then((val) => {
      if(val){
        this.user = decode(val);
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

  confirm(){
    if(!this.bookingForm.valid)
      Object.keys(this.bookingForm.controls).forEach(field => { // {1}
        const control = this.bookingForm.get(field);            // {2}
        control.markAsTouched({ onlySelf: true });       // {3}
      });
    else{
      //Strip extra characters from phone number
      this.bookingForm.value.phone = this.bookingForm.value.phone.replace(/[() -]/g,'');
      var postObject = {
        user: this.bookingForm.value,
        people: this.people,
        timeslot: this.timeslot,
        date: this.date,
        deviceId: this.device.uuid
      };

      this.API.makePost('booking/' + this.restaurant._id + '/create', postObject).subscribe(response => {
        var title;
        var message;
        this.response = response;

        if(this.response.message){
          if(this.response.message == 'overcapacity'){ //If requested capacity is over the available capacity
            title = 'Overcapacity';
            message = 'Sorry, but this timeslot only has '+this.response.remainder+' seats left.';
          }

          if(this.response.message == 'user exists'){ //If the email address belongs to a registered account
            title = 'Email Address Taken';
            message = 'This email address belongs to a registered account. Please login or use a different email.';
          }

          if(this.response.message == 'booking limit'){ //If the user has reached the booking limit
            title = 'Booking Limit';
            message = 'You already have 3 upcoming bookings and cannot make anymore.';
          }

          if(this.response.message == 'error'){ //If there was an error adding the user or the booking
            title = 'Error';
            message = 'Sorry, there was an error with your booking. Please try again.';
          }

          this.presentAlert(title, message);
        }
        else{
          this.storage.get('eatiblUser').then((val) => {
            if(val){
              this.user = decode(val);
            }
            else{
              this.storage.set('eatiblUser', this.response.token)
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
  }

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

  //Prompt terms of use / privacy policy modal
  openTermsModal(){
    const termsModal = this.modal.create('TermsModalPage');

    termsModal.present();
  }
}
