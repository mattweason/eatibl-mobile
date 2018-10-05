import {Component, ViewChild} from '@angular/core';
import {IonicPage, NavController, NavParams, Slides, ViewController, ModalController, Events} from 'ionic-angular';
import { ActivityLoggerProvider } from "../../providers/activity-logger/activity-logger";
import { Facebook, FacebookLoginResponse } from '@ionic-native/facebook';
import { Device } from '@ionic-native/device';
import { Storage } from '@ionic/storage';
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {ApiServiceProvider} from "../../providers/api-service/api-service";

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

  currentIndex = 0;
  firstLoad = true;
  submitted = false;
  emailCapture: FormGroup;
  emailCaptured = false;
  haveEmail = false;
  type: any;

  constructor(
    public navCtrl: NavController,
    public viewCtrl: ViewController,
    private modal: ModalController,
    private device: Device,
    public events: Events,
    private fb: Facebook,
    public navParams: NavParams,
    private formBuilder: FormBuilder,
    private storage: Storage,
    private API: ApiServiceProvider,
    private log: ActivityLoggerProvider
  ) {
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
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad IntroSlidesPage');
    this.storage.get('eatiblUser').then((val) => {
      console.log(val)
      if(val)
        this.haveEmail = true;
    });
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

  submitEmail(){
    this.submitted = true;
    var postObj = {
      email: this.emailCapture.value.email,
      deviceId: this.device.uuid
    }
    if(this.emailCapture.valid) {
      //Run the check to see if this user has been verified
      this.API.makePost('register/emailOnly', postObj).subscribe(res => {
        if(res['message'] == 'success' || res['message'] == 'existing') {
          this.log.sendEvent('Email Capture: ' +res['message'], 'Intro Slides Modal', JSON.stringify(this.emailCapture.value));
          this.emailCaptured = true;
          var current = this;
          setTimeout(function () {
            current.events.publish('email:captured');
            current.nextSlide();
            current.haveEmail = true;
            if(res['message'] == 'success')
              current.storage.set('eatiblUser', res['token']);
          }, 1000);
        } else {
          this.nextSlide();
          this.log.sendEvent('Email Capture: Failed', 'Intro Slides Modal', '');
        }
      });
    }
  }

  clearError(){
    this.submitted = false;
  }

  //Facebook login
  loginFacebook(){
    this.fb.login(['public_profile', 'email'])
      .then( (res: FacebookLoginResponse) => {
        // The connection was successful
        if(res.status == "connected") {

          // Get user ID and Token
          var fb_id = res.authResponse.userID;
          var fb_token = res.authResponse.accessToken;

          // Get user infos from the API
          this.fb.api("/me?fields=name,email", []).then((user) => {

            //Add device id to user object
            user['deviceId'] = this.device.uuid;

            this.API.makePost('register/facebook', user).subscribe(response => {
              this.storage.set('eatiblUser',response['token']);
              this.storage.set('eatiblFBToken',fb_token);
              this.events.publish('user:statuschanged');
              this.events.publish('email:captured');
              this.nextSlide();
              this.haveEmail = true;
            });

            // => Open user session and redirect to the next page

          }).catch((e) => {
            this.log.sendErrorEvent('Facebook API call', 'Intro Slides', JSON.stringify(e), 'Failed to get info from facebook');
          });

        }
        // An error occurred while loging-in
        else {
          this.log.sendErrorEvent('Facebook Login', 'Intro Slides', JSON.stringify(res), 'Facebook login connection was not successful');
          console.log("An error occurred...");

        }

      }).catch((e) => {
        this.log.sendErrorEvent('Facebook Login', 'Intro Slides', JSON.stringify(e), 'Failed to log in to facebook');
        console.log('Error logging into Facebook', e);
      });
  }

}
