import {Component, ViewChild} from '@angular/core';
import {IonicPage, NavController, NavParams, Slides, ViewController, ModalController, Events, Platform} from 'ionic-angular';
import { ActivityLoggerProvider } from "../../providers/activity-logger/activity-logger";
import { Facebook, FacebookLoginResponse } from '@ionic-native/facebook';
import { Device } from '@ionic-native/device';
import { Storage } from '@ionic/storage';
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import { FunctionsProvider } from '../../providers/functions/functions';
import {ApiServiceProvider} from "../../providers/api-service/api-service";
import * as decode from 'jwt-decode';
import { GooglePlus } from '@ionic-native/google-plus';

/**
 * Generated class for the IntroSlidesPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-intro-slides',
  templateUrl: 'intro-slides.html',
})
export class IntroSlidesPage {
  @ViewChild(Slides) slides: Slides;

  private backButtonUnregister: any;
  currentIndex = 0;
  firstLoad = true;
  submitted = false;
  emailCapture: FormGroup;
  emailCaptured = false;
  haveEmail = false;
  type: any;
  newUser = false;
  userProfile: any = null;
  testObject: any;
  mobilePlatform: any;

  constructor(
    public navCtrl: NavController,
    public viewCtrl: ViewController,
    private modal: ModalController,
    private device: Device,
    private platform: Platform,
    public events: Events,
    public functions: FunctionsProvider,
    private fb: Facebook,
    public navParams: NavParams,
    private formBuilder: FormBuilder,
    private storage: Storage,
    private API: ApiServiceProvider,
    private googlePlus: GooglePlus,
    private log: ActivityLoggerProvider
  ) {
    //What platform is this?
    if(platform.is('ios'))
      this.mobilePlatform = 'ios';
    if(platform.is('android'))
      this.mobilePlatform = 'android';

    //Two types, introduction slides and how it works slides
    this.type = navParams.get('type');

    //Form controls and validation
    this.emailCapture = this.formBuilder.group({
      email: [
        '', Validators.compose([
          Validators.required,
          Validators.email
        ])
      ]
    });

    //Listen to when a new user has signed up on the sign up page
    events.subscribe('newuser:signedup', () => {
      this.nextSlide();
      this.haveEmail = true;
    });

    //Listen to when a new user has signed up on the sign up page
    events.subscribe('olduser:loggedin', () => {
      this.nextSlide();
      this.haveEmail = true;
    });
  }

  ionViewDidLoad() {
    this.storage.get('eatiblUser').then((val) => {
      if(val)
        this.haveEmail = true;
    });

    if(this.navParams.get('newUser')){ //If runtime open, don't allow swiping

      //Disable back button dismiss on android
      this.backButtonUnregister = this.platform.registerBackButtonAction(() => {});
    }
  }

  ionViewWillLeave(){
    if(this.navParams.get('newUser')) //If runtime open, don't allow swiping
      this.backButtonUnregister();
  }

  slideChanged(){
    this.firstLoad = false;
    this.currentIndex = this.slides.getActiveIndex();
  }

  nextSlide(){
    this.log.sendEvent('Intro Slide: Next', 'Intro Slides Modal', '');
    this.slides.slideNext();
  }

  prevSlide(){
    this.log.sendEvent('Intro Slide: Previous', 'Intro Slides Modal', '');
    this.slides.slidePrev();
  }

  closeModal(cond){
    this.log.sendEvent('Intro Slide: Closed', 'Intro Slides Modal', 'Condition (x for close button in top right corner, or close at end): '+cond);
    this.viewCtrl.dismiss();
  }

  //Open the faqs and support modal
  learnMore(){
    this.log.sendEvent('Learn More: Visit FAQ', 'Intro Slides Modal', '');
    const supportModal = this.modal.create('SupportModalPage');
    supportModal.present();
    this.viewCtrl.dismiss();
  }

  // submitEmail(){
  //   this.submitted = true;
  //   var postObj = {
  //     email: this.emailCapture.value.email,
  //     deviceId: this.device.uuid
  //   }
  //   if(this.emailCapture.valid) {
  //     //Run the check to see if this user has been verified
  //     this.API.makePost('register/emailOnly', postObj).subscribe(res => {
  //       if(res['message'] == 'success' || res['message'] == 'existing') {
  //         this.log.sendEvent('Email Capture: ' +res['message'], 'Intro Slides Modal', JSON.stringify(this.emailCapture.value));
  //         this.emailCaptured = true;
  //         var current = this;
  //         setTimeout(function () {
  //           current.events.publish('email:captured');
  //           current.nextSlide();
  //           current.haveEmail = true;
  //           if(res['message'] == 'success')
  //             current.storage.set('eatiblUser', res['token']);
  //         }, 1000);
  //       } else {
  //         this.nextSlide();
  //         this.log.sendEvent('Email Capture: Failed', 'Intro Slides Modal', '');
  //       }
  //     });
  //   }
  // }

  signup(){
    this.log.sendEvent('Signup Button Clicked', 'Intro Slides Modal', '');
    this.navCtrl.push('SignupPage');
  }

  clearError(){
    this.submitted = false;
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

        let promocodeModal = this.modal.create('PromocodeModalPage', { user: decode(response['token']) }, { cssClass: 'promocode-modal'});
        promocodeModal.onDidDismiss(() => {
          this.haveEmail = true;
        });
        promocodeModal.present();
      });
    }).catch(err => {
      this.log.sendErrorEvent('Google Login', 'Intro Slides', JSON.stringify(err), 'Google login was unsuccessful');
    })
  }

  //Facebook login
  loginFacebook(){
    this.log.sendEvent('Facebook Login Initiated', 'Intro Slides Modal', '');
    this.fb.login(['public_profile', 'email'])
      .then( (res: FacebookLoginResponse) => {
        // The connection was successful
        if(res.status == "connected") {

          // Get user ID and Token
          var fb_id = res.authResponse.userID;
          var fb_token = res.authResponse.accessToken;

          // Get user infos from the API
          this.fb.api("/me?fields=name,email", []).then((user) => {
            this.log.sendEvent('Facebook API Call Successful', 'Intro Slides Modal', JSON.stringify(user));

            //Add device id to user object
            user['deviceId'] = this.device.uuid;

            this.API.makePost('register/facebook', user).subscribe(response => {
              if(response['newUser'])
                this.functions.scheduleCountdownNotifications();
              this.storage.set('eatiblUser',response['token']);
              this.storage.set('eatiblFBToken',fb_token);
              this.events.publish('user:statuschanged');
              this.events.publish('email:captured');
              this.log.sendEvent('Facebook Login Successful', 'Intro Slides Modal', JSON.stringify(response));

              let promocodeModal = this.modal.create('PromocodeModalPage', { user: decode(response['token']) }, { cssClass: 'promocode-modal'});
              promocodeModal.onDidDismiss(() => {
                this.haveEmail = true;
              });
              promocodeModal.present();
            });

            // => Open user session and redirect to the next page

          }).catch((e) => {
            this.log.sendErrorEvent('Facebook API call', 'Intro Slides', JSON.stringify(e), 'Failed to get info from facebook');
          });

        }
        // An error occurred while loging-in
        else {
          this.log.sendErrorEvent('Facebook Login', 'Intro Slides', JSON.stringify(res), 'Facebook login connection was not successful');

        }

      }).catch((e) => {
        this.log.sendErrorEvent('Facebook Login', 'Intro Slides', JSON.stringify(e), 'Failed to log in to facebook');
      });
  }

}
