import { Component } from '@angular/core';
import {IonicPage, NavController, AlertController, Events, ModalController, Platform} from 'ionic-angular';
import { Validators, FormBuilder, FormGroup } from '@angular/forms';
import { ActivityLoggerProvider } from "../../providers/activity-logger/activity-logger";
import { FunctionsProvider } from '../../providers/functions/functions';

import { SignupPage } from '../../pages/signup/signup';
import {UserServiceProvider} from "../../providers/user-service/user-service";

/**
 * Generated class for the LoginPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-login',
  templateUrl: 'login.html',
})
export class LoginPage {

  loginForm: FormGroup;
  submitAttempt = false;
  response = {} as any;
  mobilePlatform: any;

  constructor(
    public navCtrl: NavController,
    public alertCtrl: AlertController,
    private formBuilder: FormBuilder,
    public events: Events,
    public functions: FunctionsProvider,
    private modal: ModalController,
    private log: ActivityLoggerProvider,
    private platform: Platform,
    private userService: UserServiceProvider
  ) {
    //What platform is this?
    if(platform.is('ios'))
      this.mobilePlatform = 'ios';
    if(platform.is('android'))
      this.mobilePlatform = 'android';

    //Form controls and validation
    this.loginForm = this.formBuilder.group({
      email: [
        '', Validators.compose([
          Validators.required,
          Validators.email
        ])
      ],
      password: [
        '', Validators.compose([
          Validators.required
        ])
      ]
    });
  }

  login(){
    this.log.sendEvent('Login: Attempted', 'Login', this.loginForm.value.email || "");
    if(!this.loginForm.valid){
      this.log.sendEvent('Login: Invalid', 'Login', 'Form does not have valid inputs');
      Object.keys(this.loginForm.controls).forEach(field => { // {1}
        const control = this.loginForm.get(field);            // {2}
        control.markAsTouched({ onlySelf: true });       // {3}
      });
      this.submitAttempt = true;
    }
    else{
      this.userService.login(this.loginForm.value, () => {
        this.navCtrl.pop();
      });
    }
  }

  //Trim the trailing spaces from form input values
  cleanValue(field){
    if(/\s+$/.test(this.loginForm.value[field]))
      this.loginForm.controls[field].setValue(this.loginForm.value[field].trim());
  }

  resetPassword(){
    this.userService.passwordReset(this.loginForm.value.email || '');
  }

  signUp(){
    this.log.sendEvent('Signup Navigated To', 'Login', "User clicked the signup button from the login section");
    this.navCtrl.push('SignupPage').then(() => {
      var index = this.navCtrl.getActive().index;
      this.navCtrl.remove(index-1);
    });
  }

  //Prompt terms of use / privacy policy modal
  openTermsModal(){
    const termsModal = this.modal.create('TermsModalPage');

    termsModal.present();
  }

  //Google Plus login
  loginGoogle(){
    this.userService.loginGoogle(() => {
      this.navCtrl.pop();
    });
  }

  //Facebook login
  loginFacebook(){
    this.userService.loginFacebook(() => {
      this.navCtrl.pop();
    });
  }
}
