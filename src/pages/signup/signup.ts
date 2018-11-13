import { Component } from '@angular/core';
import {IonicPage, NavController, AlertController, Events, ModalController, Platform} from 'ionic-angular';
import { Validators, FormBuilder, FormGroup } from '@angular/forms';
import { ApiServiceProvider } from "../../providers/api-service/api-service";
import { ActivityLoggerProvider } from "../../providers/activity-logger/activity-logger";
import { Facebook, FacebookLoginResponse } from '@ionic-native/facebook';
import { GooglePlus } from '@ionic-native/google-plus';
import { Storage } from '@ionic/storage';
import { FunctionsProvider } from '../../providers/functions/functions';
import { Device } from '@ionic-native/device';

/**
 * Generated class for the LoginPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-signup',
  templateUrl: 'signup.html',
})
export class SignupPage {

  signupForm: FormGroup;
  response = {} as any;
  submitAttempt = false;
  user: any;
  postObject= {} as any;
  promoCode = {} as any;
  intro = false;
  callback: any;
  mobilePlatform: any;

  constructor(
    public navCtrl: NavController,
    private API: ApiServiceProvider,
    public alertCtrl: AlertController,
    private formBuilder: FormBuilder,
    private device: Device,
    private storage: Storage,
    public functions: FunctionsProvider,
    private fb: Facebook,
    public events: Events,
    private modal: ModalController,
    private log: ActivityLoggerProvider,
    private platform: Platform,
    private googlePlus: GooglePlus
  ) {
    //What platform is this?
    if(platform.is('ios'))
      this.mobilePlatform = 'ios';
    if(platform.is('android'))
      this.mobilePlatform = 'android';

    //Form controls and validation
    this.signupForm = this.formBuilder.group({
      name: [
        '', Validators.compose([
          Validators.required
        ])
      ],
      email: [
        '', Validators.compose([
          Validators.required,
          Validators.email
        ])
      ],
      password: [
        '', Validators.compose([
          Validators.required,
          Validators.minLength(8)
        ])
      ],
      promoCode: ''
    });
  }

  signup(){
    this.log.sendEvent('Signup: Attempted', 'Sign up', 'User has begun sign-up process');
    if(!this.signupForm.valid){
      Object.keys(this.signupForm.controls).forEach(field => { // {1}
        const control = this.signupForm.get(field);            // {2}
        control.markAsTouched({ onlySelf: true });       // {3}
      });
      this.submitAttempt = true;
    }
    else {
      if(this.signupForm.value.promoCode.length > 0)
        this.API.makePost('promoCode/validate', {promoCode: this.signupForm.value.promoCode}).subscribe(res => {
          if(res['message'] == 'invalid'){
            this.signupForm.controls['promoCode'].setErrors({'incorrect': true});
          } else {
            this.promoCode = res['promoCode'];
          }
        });
      this.submitRegistration();
    }
  }

  //Trim the trailing spaces from form input values
  cleanValue(field){
    if(/\s+$/.test(this.signupForm.value[field]))
      this.signupForm.controls[field].setValue(this.signupForm.value[field].trim());
  }

  //Make the api call to submit the registration
  submitRegistration(){
    //Cache user object and add device id
    this.postObject = this.signupForm.value;
    this.postObject.deviceId = this.device.uuid;
    if(this.promoCode)
      this.postObject.promoCode = [this.promoCode];

    //make API call to get token if successful, or status 401 if login failed
    this.API.makePost('register', this.postObject).subscribe(response => {
      var newObj = this.postObject; delete newObj.password; //remove password and save data to log
      var title;
      var message;
      this.response = response;
      if(this.response.message == 'success'){
        this.log.sendEvent('Signup: Success', 'Sign up', JSON.stringify(newObj));
        this.storage.set('eatiblUser',this.response.token).then((val) => {
          title = 'Account created';
          if(this.promoCode.code)
            message = "Your account has been created and the "+this.promoCode['promotion']+" promo code has been applied to your account!";
          else
            message = 'Your account has been created!';
          this.presentSuccessAlert(title, message);
          this.functions.scheduleCountdownNotifications();
          this.events.publish('user:statuschanged');
          this.events.publish('email:captured');
        });
      }
      if(this.response.message == 'email taken'){
        this.log.sendEvent('Signup: Email Taken', 'Sign up', JSON.stringify(newObj));
        title = 'Email Taken';
        message = 'This email is already associated with an account. Please choose a different email or log in.';
        this.presentAlert(title, message);
      }
      if(this.response.message == 'error'){
        this.log.sendEvent('Signup: Error', 'Sign up', JSON.stringify(newObj));
        title = 'Error';
        message = 'There was an error creating your account. Please try again.';
        this.presentAlert(title, message);
      }

      //BELOW CODE FOR OUTPUTTING USER INFO

      //this.storage.get('user').then((val) => {
      //  var currentUser = val;
      //  console.log(currentUser);
      //  console.log(decode(currentUser));
      //});
    });
  }

  presentAlert(title, message){
    let alert = this.alertCtrl.create({
      title: title,
      message: message,
      buttons: ['Ok']
    });
    alert.present();
  }

  presentSuccessAlert(title, message){
    let alert = this.alertCtrl.create({
      title: title,
      message: message,
      buttons: ['Ok']
    });
    alert.present();
    alert.onDidDismiss(() => {
      this.events.publish('newuser:signedup');
      this.navCtrl.pop();
    });
  }

  //Prompt terms of use / privacy policy modal
  openTermsModal(){
    const termsModal = this.modal.create('TermsModalPage');

    termsModal.present();
  }

  //Google Plus login
  loginGoogle(){
    this.log.sendEvent('Google Login Initiated', 'Intro Slides Modal', '');
    this.googlePlus.login({
      webClientId: '518520693304-r2vlho0nfei8obat0eui5g196oiav98r.apps.googleusercontent.com',
      offline: true
    }).then(user => {
      //Add device id to user object
      user['deviceId'] = this.device.uuid;
      this.API.makePost('register/google', user).subscribe(response => {
        if(response['newUser'])
          this.functions.scheduleCountdownNotifications();
        this.storage.set('eatiblUser',response['token']);
        this.events.publish('user:statuschanged');
        this.events.publish('email:captured');
        this.log.sendEvent('Google Login Successful', 'Intro Slides Modal', JSON.stringify(response));
        this.navCtrl.pop();
      });
    }).catch(err => {
      this.log.sendErrorEvent('Google Login', 'Intro Slides', JSON.stringify(err), 'Google login was unsuccessful');
    })
  }

  //Facebook login
  loginFacebook(){
    this.log.sendEvent('Facebook Login Initiated', 'Signup', '');
    this.fb.login(['public_profile', 'email'])
      .then( (res: FacebookLoginResponse) => {
        // The connection was successful
        if(res.status == "connected") {

          // Get user ID and Token
          var fb_id = res.authResponse.userID;
          var fb_token = res.authResponse.accessToken;

          // Get user infos from the API
          this.fb.api("/me?fields=name,email", []).then((user) => {
            this.log.sendEvent('Facebook API Call Successful', 'Signup', JSON.stringify(user));

            //Add device id to user object
            user['deviceId'] = this.device.uuid;

            this.API.makePost('register/facebook', user).subscribe(response => {
              if(response['newUser'])
                this.functions.scheduleCountdownNotifications();
              this.storage.set('eatiblUser',response['token']);
              this.storage.set('eatiblFBToken',fb_token);
              this.events.publish('user:statuschanged');
              this.events.publish('email:captured');
              this.log.sendEvent('Facebook Login Successful', 'Signup', JSON.stringify(response));
              this.navCtrl.pop();
            });

            // => Open user session and redirect to the next page

          }).catch((e) => {
            this.log.sendErrorEvent('Facebook API call', 'Signup', JSON.stringify(e), 'Failed to get info from facebook');
          });

        }
        // An error occurred while loging-in
        else {
          this.log.sendErrorEvent('Facebook Login', 'Signup', JSON.stringify(res), 'Facebook login connection was not successful');

        }

      })
      .catch((e) => {
        this.log.sendErrorEvent('Facebook Login', 'Signup', JSON.stringify(e), 'Failed to log in to facebook');
      });
  }

  login(){
    this.log.sendEvent('Login: Initiated', 'Sign Up', 'User pressed login button');
    this.navCtrl.push('LoginPage').then(() => {
      var index = this.navCtrl.getActive().index;
      this.navCtrl.remove(index-1);
    });
  }

}
