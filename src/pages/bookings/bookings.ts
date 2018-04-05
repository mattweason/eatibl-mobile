import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { ApiServiceProvider } from "../../providers/api-service/api-service";
import { Storage } from '@ionic/storage';
import * as decode from 'jwt-decode';

import { LoginPage } from '../../pages/login/login';
import { SignupPage } from '../../pages/signup/signup';

/**
 * Generated class for the BookingsPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@Component({
  selector: 'page-bookings',
  templateUrl: 'bookings.html',
})
export class BookingsPage {
  user = {
    email: '',
    name: '',
    phone: '',
    type: ''
  };

  constructor(public navCtrl: NavController, public navParams: NavParams, private API: ApiServiceProvider, private storage: Storage) {
  }

  ngOnInit() {
    this.storage.get('user').then((val) => {
     this.user = decode(val);
    });
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad BookingsPage');
  }

  signUp(){
    this.navCtrl.push(SignupPage);
  }

  login(){
    this.navCtrl.push(LoginPage);
  }

}
