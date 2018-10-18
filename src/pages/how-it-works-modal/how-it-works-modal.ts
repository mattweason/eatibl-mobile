import {Component, ViewChild} from '@angular/core';
import {IonicPage, NavController, NavParams, Slides, ViewController, ModalController, Events, Platform} from 'ionic-angular';
import { ActivityLoggerProvider } from "../../providers/activity-logger/activity-logger";
import { Device } from '@ionic-native/device';
import { Storage } from '@ionic/storage';

/**
 * Generated class for the HowItWorksModalPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-how-it-works-modal',
  templateUrl: 'how-it-works-modal.html',
})
export class HowItWorksModalPage {
  @ViewChild(Slides) slides: Slides;

  currentIndex = 0;
  emailCaptured = false;
  haveEmail = false;
  type: any;
  newUser = false;
  allowSwiping = true;
  mobilePlatform: any;

  constructor(
    public navCtrl: NavController,
    public viewCtrl: ViewController,
    private modal: ModalController,
    private device: Device,
    public events: Events,
    public navParams: NavParams,
    private storage: Storage,
    private log: ActivityLoggerProvider
  ) {}

  ionViewDidLoad() {
  }

  ionViewWillLeave(){
  }

  slideChanged(){
    this.currentIndex = this.slides.getActiveIndex();
  }

  nextSlide(){
    this.log.sendEvent('How it Works Slide: Next', 'How it Works Modal', '');
    this.slides.slideNext();
  }

  prevSlide(){
    this.log.sendEvent('How it Works Slide: Previous', 'How it Works Modal', '');
    this.slides.slidePrev();
  }

  closeModal(cond){
    this.log.sendEvent('How it Works Slide: Closed', 'How it Works Modal', '');
    this.viewCtrl.dismiss();
  }

  //Open the faqs and support modal
  learnMore(){
    this.log.sendEvent('Learn More: Visit FAQ', 'How it Works Modal', '');
    const supportModal = this.modal.create('SupportModalPage');
    supportModal.present();
    this.viewCtrl.dismiss();
  }

}
