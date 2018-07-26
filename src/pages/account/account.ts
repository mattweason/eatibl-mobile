import { Component } from '@angular/core';
import {IonicPage, NavController, NavParams, ModalController} from 'ionic-angular';
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

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private storage: Storage,
    private API: ApiServiceProvider,
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

  changeAccounts(){
    this.log.sendEvent('Change account', 'Account', '');
    this.storage.remove('eatiblUser');
    this.bookingUpcoming = [];
    this.bookingHistory = [];
    this.navCtrl.push('LoginPage');
  }

}
