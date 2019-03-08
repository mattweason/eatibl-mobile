import {Component, ViewChild} from '@angular/core';
import {IonicPage, NavController, NavParams, Slides, ViewController, ModalController, Events, Platform} from 'ionic-angular';
import { ActivityLoggerProvider } from "../../providers/activity-logger/activity-logger";
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import { FunctionsProvider } from '../../providers/functions/functions';
import {UserServiceProvider} from "../../providers/user-service/user-service";

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
  mobilePlatform: any;

  constructor(
    public navCtrl: NavController,
    public viewCtrl: ViewController,
    private modal: ModalController,
    private platform: Platform,
    public events: Events,
    public functions: FunctionsProvider,
    private userService: UserServiceProvider,
    public navParams: NavParams,
    private formBuilder: FormBuilder,
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
  }

  ionViewDidLoad() {
    if(this.userService.user.email)
      this.haveEmail = true;

    if(this.navParams.get('newUser')){
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

  signup(){
    this.log.sendEvent('Signup Button Clicked', 'Intro Slides Modal', '');
    this.navCtrl.push('SignupPage');
  }

  clearError(){
    this.submitted = false;
  }

  //Google Plus login
  loginGoogle(){
    this.userService.loginGoogle(() => {
        this.haveEmail = true;
      // let promocodeModal = this.modal.create('PromocodeModalPage', {}, { cssClass: 'promocode-modal'});
      // promocodeModal.onDidDismiss(() => {
      //   this.haveEmail = true;
      // });
      // promocodeModal.present();
    });
  }

  //Facebook login
  loginFacebook(){
    this.userService.loginFacebook(() => {
      this.haveEmail = true;
      // let promocodeModal = this.modal.create('PromocodeModalPage', {}, { cssClass: 'promocode-modal'});
      // promocodeModal.onDidDismiss(() => {
      //   this.haveEmail = true;
      // });
      // promocodeModal.present();
    });
  }

}
