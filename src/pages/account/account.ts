import { Component } from '@angular/core';
import {IonicPage, NavController, NavParams, ModalController} from 'ionic-angular';
import { ApiServiceProvider } from "../../providers/api-service/api-service";
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
    private modal: ModalController
  ) {
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad AccountPage');
  }

  ionViewDidEnter() {
    console.log(this.bookingHistory)
    this.storage.get('eatiblUser').then((val) => {
      if(val){
        this.user = decode(val);
        console.log(this.user)
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
    const inviteModal = this.modal.create('InviteModalPage');

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
    this.navCtrl.push('SignupPage');
  }

  login(){
    this.navCtrl.push('LoginPage');
  }

  changeAccounts(){
    this.storage.remove('eatiblUser');
    this.bookingUpcoming = [];
    this.bookingHistory = [];
    this.navCtrl.push('LoginPage');
  }

}
