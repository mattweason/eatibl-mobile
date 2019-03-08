import { Injectable } from '@angular/core';
import {GooglePlus} from "@ionic-native/google-plus";
import {Facebook, FacebookLoginResponse} from "@ionic-native/facebook";
import {ActivityLoggerProvider} from "../activity-logger/activity-logger";
import {ApiServiceProvider} from "../api-service/api-service";
import { Device } from '@ionic-native/device';
import { Storage } from '@ionic/storage';
import * as decode from 'jwt-decode';
import {AlertController, Events} from "ionic-angular";
import {FunctionsProvider} from "../functions/functions";

/*
  Generated class for the UserServiceProvider provider.

  See https://angular.io/guide/dependency-injection for more info on providers
  and Angular DI.
*/
@Injectable()
export class UserServiceProvider {

  public user = {} as any;
  public userData = {} as any;

  constructor(
    private device: Device,
    public alertCtrl: AlertController,
    public functions: FunctionsProvider,
    private API: ApiServiceProvider,
    private log: ActivityLoggerProvider,
    private fb: Facebook,
    private storage: Storage,
    private events: Events,
    private googlePlus: GooglePlus
  ) {
    this.storage.get('eatiblUser').then((val) => {
      if(val){
        this.user = decode(val);
        this.getUserData();
      }
      else
        this.log.sendEvent('Loaded: Unregistered User', 'runTime', "User isn't logged in");
    });
  }

  //Grab all extra information for a user
  getUserData(){
    this.API.makePost('user/getUserData', {userId: this.user._id}).subscribe(response => {
      var starredRestoIds = [];

      //Create simple array of resto ids
      for(var i = 0; i < response['user']['starred_restaurants'].length; i++){
        starredRestoIds.push(response['user']['starred_restaurants'][i]['_id'])
      }

      this.userData.starredRestoIds = starredRestoIds;
      this.userData.starredRestos = response['user']['starred_restaurants'];
      this.log.sendEvent('Loaded: User Data', 'runTime', JSON.stringify(this.user));
    })
  }

  //Update user object in app and in storage
  updateUser(token){
    if(token){ //Logouts pass empty string as token
      this.user = decode(token);
      this.getUserData();
      this.storage.set('eatiblUser', token);
      this.events.publish('user:statuschanged');
    }
    else{
      this.user = {}; //Clear basic user data
      this.userData = {}; //Clear all extra user data
      this.storage.remove('eatiblUser');
      this.events.publish('user:statuschanged');
    }
  }

  //Password reset
  passwordReset(email){
    this.log.sendEvent('Password Reset Button Pressed', 'User Service', 'Email: ' + email);
    let alert = this.alertCtrl.create({
      title: 'Reset Password',
      message: 'Please enter the email address associated with your Eatibl account.',
      inputs: [
        {
          name: 'email',
          placeholder: 'Email',
          type: 'text',
          value: email
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
              this.log.sendEvent('Password Reset Request Success', 'User Service', 'Email: ' + email + '| Response: '+JSON.stringify(response));
              this.functions.presentAlert('', 'An email has been sent to your address with further instructions.', 'Ok');
            });
          }
        }
      ]
    });
    alert.present();
  }

  //Vanilla login process
  login(userObject, callback){
    var title;
    var message;

    //make API call to get token if successful, or status 401 if login failed
    this.API.makePost('token', userObject).subscribe(response => {

      //Handle logging and error alerts
      if(response['message'] == 'not found'){
        this.log.sendEvent('Login: Unsuccessful', 'User Service', userObject.email + ", email not found");

        title = 'Incorrect Credentials';
        message = 'Email and password combination not found.';
        this.functions.presentAlert(title, message, 'Ok');
      }

      else if (response['message'] == 'facebook user'){
        this.log.sendEvent('Login: Unsuccessful', 'User Service', userObject.email + ", email is attached to facebook account");

        title = 'Incorrect Credentials';
        message = 'This email is associated with a Facebook account. Please use the Facebook login to continue.';
        this.functions.presentAlert(title, message, 'Ok');
      }

      else if (response['message'] == 'google user'){
        this.log.sendEvent('Login: Unsuccessful', 'User Service', userObject.email + ", email is attached to google account");

        title = 'Incorrect Credentials';
        message = 'This email is associated with a Google account. Please use the Google login to continue.';
        this.functions.presentAlert(title, message, 'Ok');
      }

      else{
        this.log.sendEvent('Login: Successful', 'User Service', userObject.email);

        this.updateUser(response['token']); //Update local and stored user objects

        callback();
      }
    });
  }

  //Vanilla sign up process
  signup(userObject, callback){
    this.log.sendEvent('Signup: Initiated', 'User Service', 'User has begun sign-up process');

    var newObj = userObject,
        title,
        message;
    delete newObj.password; //remove password and save data to log

    //make API call to get token if successful, or status 401 if login failed
    this.API.makePost('register', userObject).subscribe(response => {
      var response = response;

      //Handle logging and alerts
      if(response['message'] == 'success'){
        this.log.sendEvent('Signup: Success', 'User Service', JSON.stringify(newObj));

        this.updateUser(response['token']); //Update local and stored user objects

        if(response['newUser'])
          this.functions.scheduleCountdownNotifications();

        //Build alert content
        title = 'Account created';
        if(userObject['promoCode'])
          message = "Your account has been created and the "+userObject['promoCode']['promotion']+" promo code has been applied to your account!";
        else
          message = 'Your account has been created!';
        this.functions.presentAlertCallback(title, message, 'Ok', () => {
          callback();
        });
      }

      if(response['message'] == 'email taken'){
        this.log.sendEvent('Signup: Email Taken', 'User Service', JSON.stringify(newObj));

        //Build alert content
        title = 'Email Taken';
        message = 'This email is already associated with an account. Please choose a different email or log in.';
        this.functions.presentAlert(title, message, 'Ok');
      }

      if(response['message'] == 'error'){
        this.log.sendEvent('Signup: Error', 'User Service', JSON.stringify(newObj));

        //Build alert content
        title = 'Error';
        message = 'There was an error creating your account. Please try again.';
        this.functions.presentAlert(title, message, 'Ok');
      }
    });
  }

  //Google login
  loginGoogle(callback){
    this.log.sendEvent('Google Login Initiated', 'User Service', '');
    this.googlePlus.login({
      webClientId: '518520693304-r2vlho0nfei8obat0eui5g196oiav98r.apps.googleusercontent.com',
      offline: true
    }).then(user => {
      //Add device id to user object
      user['deviceId'] = this.device.uuid;
      this.API.makePost('register/google', user).subscribe(response => {
        this.log.sendEvent('Google Login Successful', 'User Service', JSON.stringify(response));

        this.updateUser(response['token']); //Update local and stored user objects

        if(response['newUser'])
          this.functions.scheduleCountdownNotifications();

        callback();
      });
    }).catch(err => {
      this.functions.presentAlert('Google Error', 'There was an error trying to log you in through Google. Please try again.', 'Ok');
      this.log.sendErrorEvent('Google Login', 'User Service', JSON.stringify(err)); //Google login was
    })
  }

  //Facebook login
  loginFacebook(callback){
    this.log.sendEvent('Facebook Login Initiated', 'User Service', '');
    this.fb.login(['public_profile', 'email'])
      .then( (res: FacebookLoginResponse) => {
        // The connection was successful
        if(res.status == "connected") {

          // Get user infos from the API
          this.fb.api("/me?fields=name,email", []).then((user) => {
            this.log.sendEvent('Facebook API Call Successful', 'User Service', JSON.stringify(user));

            //Add device id to user object
            user['deviceId'] = this.device.uuid;

            this.API.makePost('register/facebook', user).subscribe(response => {
              this.log.sendEvent('Facebook Login Successful', 'User Service', JSON.stringify(response));
              this.updateUser(response['token']);
              this.events.publish('user:statuschanged');

              if(response['newUser'])
                this.functions.scheduleCountdownNotifications();

              callback();
            });

            // => Open user session and redirect to the next page

          }).catch((e) => {
            this.functions.presentAlert('Facebook Error', 'There was an error trying to log you in through Facebook. Please try again.', 'Ok');
            this.log.sendErrorEvent('Facebook API call', 'User Service', JSON.stringify(e)); //Failed to get info from facebook
          });

        }
        // An error occurred while logging-in
        else {
          this.functions.presentAlert('Facebook Error', 'There was an error trying to log you in through Facebook. Please try again.', 'Ok');
          this.log.sendErrorEvent('Facebook Login', 'User Service', JSON.stringify(res)); //Facebook login connection was not successful
        }

      })
      .catch((e) => {
        this.functions.presentAlert('Facebook Error', 'There was an error trying to log you in through Facebook. Please try again.', 'Ok');
        this.log.sendErrorEvent('Facebook Login', 'User Service', JSON.stringify(e)); //Failed to log in to facebook
      });
  }

  //Logout process
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
            this.log.sendEvent('Logout', 'User Service', '');
            this.updateUser('');
          }
        }
      ]
    });
    alert.present();
  }

  //User favorites a restaurant
  starResto(userId, restoId, callback){
    var submitObj = {
      userId: userId,
      restoId: restoId
    }
    this.API.makePost('user/starResto', submitObj).subscribe(response => {
      this.log.sendEvent('User starred restaurant ', 'User Service', JSON.stringify(response));
      this.getUserData();
      callback(response['message']);
    });
  }

}
