import { Component } from '@angular/core';
import {IonicPage, NavController, NavParams, ModalController, AlertController} from 'ionic-angular';
import { ApiServiceProvider } from "../../providers/api-service/api-service";
import { ActivityLoggerProvider } from "../../providers/activity-logger/activity-logger";
import { Storage } from '@ionic/storage';
import * as decode from 'jwt-decode';
import * as _ from 'underscore';
import moment from 'moment';

import { FunctionsProvider } from '../../providers/functions/functions';

/**
 * Generated class for the AccountPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-account',
  templateUrl: 'account.html',
})
export class AccountPage {
  user = {} as any;
  bookingUpcoming = [];
  bookingHistory = [];
  promoCode: string;
  promoRes = '';

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private storage: Storage,
    private API: ApiServiceProvider,
    public alertCtrl: AlertController,
    private functions: FunctionsProvider,
    private modal: ModalController,
    private log: ActivityLoggerProvider
  ) {
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad AccountPage');
  }

  ionViewDidEnter() {
    this.storage.get('eatiblUser').then((val) => {
      if(val){
        this.user = decode(val);
        this.API.makePost('booking/user', {email: this.user.email}).subscribe(data => {
          this.sortBookings(data);
        });
      }
      else
        this.user = {
          email: '',
          name: '',
          phone: '',
          type: ''
        };
    });
  }

  promptInvite() {
    this.log.sendEvent('Invite Friends Modal', 'Account', 'User has opened modal to invite friends');
    const inviteModal = this.modal.create('InviteModalPage', { type: 'referral' });

    inviteModal.present();
  }

  submitCode() {
    this.log.sendEvent('PromoCode: Initiated', 'Account', 'User pressed promocode button');
    var postObj = {
      userId: this.user._id,
      promoCode: this.promoCode
    };

    if(this.promoCode){
      this.promoCode = this.promoCode.trim();
      this.API.makePost('user/addPromoCode', postObj).subscribe(res => {
        if(res['message'] == 'Invalid Code')
          this.promoRes = 'Invalid promo code.';
        else if(res['message'] == 'Redundant Code')
          this.promoRes = 'Promo code already applied.';
        else if(res['message'] == 'Updated'){
          this.promoCode = '';
          let message = "You've successfully applied the "+res['code']['promotion']+" promo code to your account!",
              title = 'Promo Code Applied';
          this.presentAlert(title, message);
          this.log.sendEvent('PromoCode: Success', 'Account', 'User applied promocode to account');
        }
      });
    }

  }

  //Clear promocode input error
  clearError(){
    this.promoRes = '';
  }

  sortBookings(data){
    var functions = this.functions;
    this.bookingUpcoming = _.filter(data, function(booking){
      var date = moment(booking.date).format('L');
      var time = functions.formatClockTime(booking.time, true);
      return moment(date+' '+time).isAfter(moment());
    });
    this.bookingHistory = _.filter(data, function(booking){
      var date = moment(booking.date).format('L');
      var time = functions.formatClockTime(booking.time, true);
      return moment(date+' '+time).isBefore(moment());
    });
  }

  signUp(){
    this.log.sendEvent('Signup: Initiated', 'Account', 'User pressed signup button');
    this.navCtrl.push('SignupPage');
  }

  login(){
    this.log.sendEvent('Login: Initiated', 'Account', 'User pressed login button');
    this.navCtrl.push('LoginPage');
  }

  logout(){
    let alert = this.alertCtrl.create({
      message: 'Are you sure you want to logout?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Logout',
          handler: data => {
            this.log.sendEvent('Logout', 'Account', '');
            this.storage.remove('eatiblUser');
            this.bookingUpcoming = [];
            this.bookingHistory = [];
            this.user = {};
          }
        }
      ]
    });
    alert.present();
  }

  //Generic alert box
  presentAlert(title, message){
    let alert = this.alertCtrl.create({
      title: title,
      message: message,
      buttons: ['Ok']
    });
    alert.present();
  }

}
