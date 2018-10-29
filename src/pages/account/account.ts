import { Component } from '@angular/core';
import {IonicPage, NavController, NavParams, ModalController, AlertController, Events} from 'ionic-angular';
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
  countdown = {} as any;
  accountLevel: any;
  interval: any;
  hideCountdown = false;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private storage: Storage,
    private API: ApiServiceProvider,
    public alertCtrl: AlertController,
    private functions: FunctionsProvider,
    private modal: ModalController,
    public events: Events,
    private log: ActivityLoggerProvider
  ) {
    //Reset this.user object when login or logout is performed by other components
    events.subscribe('user:statuschanged', () => {
      this.checkUser();
    });
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad AccountPage');
  }

  ionViewDidEnter() {
    this.checkUser();
  }

  checkUser(){
    this.storage.get('eatiblUser').then((val) => {
      if(val){
        this.user = decode(val);
        this.accountLevel = this.user['earlySupporter'] ? 'premium' : 'starter';
        this.API.makePost('booking/user', {email: this.user.email}).subscribe(data => {
          this.sortBookings(data);

          //Run countdown checks
          var start = moment(this.user['created_at']),
              end = start.add(3, 'days'),
              isNew = moment().isBefore(end);
          if(isNew && !this.user['earlySupporter'] && !this.countdown['hours'])
            this.runCountdown(end);
          else
            this.clearCountdown();

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

  runCountdown(end){
    this.hideCountdown = false;
    var self = this;
    this.interval = setInterval(function() {
      var difference = parseInt(end.format('X')) - parseInt(moment().format('X'));

      self.countdown['hours'] = Math.floor(difference / 3600);
      self.countdown['minutes'] = Math.floor(difference % 3600 / 60);
      self.countdown['seconds'] = Math.floor(difference % 60);
      if(self.countdown['seconds'] < 10)
        self.countdown['seconds'] = '0' + self.countdown['seconds'];
      if(self.countdown['minutes'] < 10)
        self.countdown['minutes'] = '0' + self.countdown['minutes'];

      if(difference <= 0) {
        clearInterval(self.interval);
        self.countdown = {};
      }
    }, 1000);
  }

  clearCountdown(){
    clearInterval(this.interval);
    this.countdown = {};
    this.hideCountdown = true;
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
            this.events.publish('user:statuschanged');
            //Clear info
            this.bookingUpcoming = [];
            this.bookingHistory = [];
            this.user = {};
            this.countdown = {};
            this.accountLevel = '';
            this.clearCountdown();
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

  //Present promo code modal
  addPromoCodes(){
    console.log(this.user)
    let promocodeModal = this.modal.create('PromocodeModalPage', { user: this.user }, { cssClass: 'promocode-modal'});
    promocodeModal.present();
  }

  viewPromoCodes(){
    this.log.sendEvent('View Promo Codes', 'Account', 'User requested to view applied promo codes.');
    this.API.makePost('user/viewPromoCode', this.user).subscribe(res => {
      var message = '';
      if(res['codes']){
        var promos = '';
        for(var i = 0; i < res['codes'].length; i++){
          promos = promos+'<li>'+res['codes'][i]+'</li>';
        }
        message = '<p>The following promo codes are applied to your account:</p>'+promos;
      } else
        message = '<p>You have no promo codes applied to your account.</p>';
      let alert = this.alertCtrl.create({
        title: 'Applied Promo Codes',
        message: message,
        buttons: ['Ok']
      });
      alert.present();
    });

  }

}
