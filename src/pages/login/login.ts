import { Component } from '@angular/core';
import {IonicPage, NavController, AlertController, Events} from 'ionic-angular';
import { Validators, FormBuilder, FormGroup } from '@angular/forms';
import { ApiServiceProvider } from "../../providers/api-service/api-service";
import { ActivityLoggerProvider } from "../../providers/activity-logger/activity-logger";
import { Storage } from '@ionic/storage';
import * as decode from 'jwt-decode';

import { SignupPage } from '../../pages/signup/signup';

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

  constructor(
    public navCtrl: NavController,
    private API: ApiServiceProvider,
    public alertCtrl: AlertController,
    private formBuilder: FormBuilder,
    private storage: Storage,
    public events: Events,
    private log: ActivityLoggerProvider
  ) {

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
      //make API call to get token if successful, or status 401 if login failed
      this.API.makePost('token', this.loginForm.value).subscribe(response => {
        var title;
        var message;
        this.response = response;
        if(this.response.message == 'not found'){
          this.log.sendEvent('Login: Unsuccessful', 'Login', this.loginForm.value.email || "");
          title = 'Incorrect Credentials';
          message = 'Email and password combination not found.';
          this.presentAlert(title, message);
        }
        else{
          this.log.sendEvent('Login: Successful', 'Login', this.loginForm.value.email || "");
          this.storage.set('eatiblUser',response);
          this.events.publish('user:statuschanged');
          this.navCtrl.pop();
        }

        //BELOW CODE FOR OUTPUTTING USER INFO

        //this.storage.get('user').then((val) => {
        //  var currentUser = val;
        //  console.log(currentUser);
        //  console.log(decode(currentUser));
        //});
      });
    }
  }

  //Trim the trailing spaces from form input values
  cleanValue(field){
    if(/\s+$/.test(this.loginForm.value[field]))
      this.loginForm.controls[field].setValue(this.loginForm.value[field].trim());
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad LoginPage');
  }

  resetPassword(){
    this.log.sendEvent('Password Reset Button Pressed', 'Login Page', 'Email: '+this.loginForm.value.email || '');
    let alert = this.alertCtrl.create({
      title: 'Reset Password',
      message: 'Please enter the email address associated with your Eatibl account.',
      inputs: [
        {
          name: 'email',
          placeholder: 'Email',
          type: 'text',
          value: this.loginForm.value.email
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Reset',
          handler: data => {
            this.API.makePost('user/passwordReset', data).subscribe(response => {
              this.log.sendEvent('Password Reset Request Success', 'Login Page', 'Email: '+this.loginForm.value.email || '' + '| Response: '+JSON.stringify(response));
              this.presentAlert('', 'An email has been sent to your address with further instructions.');
            });
          }
        }
      ]
    });
    alert.present();
  }

  presentAlert(title, message){
    let alert = this.alertCtrl.create({
      title: title,
      message: message,
      buttons: ['Dismiss']
    });
    alert.present();
  }

  signUp(){
    this.log.sendEvent('Signup: Initiated', 'Login', "User clicked the signup button from the login section");
    this.navCtrl.push('SignupPage').then(() => {
      var index = this.navCtrl.getActive().index;
      this.navCtrl.remove(index-1);
    });
  }
}
