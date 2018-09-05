import {Component, ViewChild} from '@angular/core';
import {IonicPage, NavController, NavParams, Slides, ViewController, ModalController} from 'ionic-angular';
import { ActivityLoggerProvider } from "../../providers/activity-logger/activity-logger";

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

  constructor(
    public navCtrl: NavController,
    public viewCtrl: ViewController,
    private modal: ModalController,
    public navParams: NavParams,
    private log: ActivityLoggerProvider
  ) {}

  ionViewDidLoad() {
    console.log('ionViewDidLoad IntroSlidesPage');
  }

  slideChanged(){
    this.firstLoad = false;
    this.currentIndex = this.slides.getActiveIndex();
    console.log(this.currentIndex)
  }

  nextSlide(cond){
    this.log.sendEvent('Intro Slide: Next', 'Intro Slides Modal', 'Condition (Lets go at start, or normal next button): '+cond);
    this.slides.slideNext();
  }

  prevSlide(){
    this.log.sendEvent('Intro Slide: Previous', 'Intro Slides Modal', '');
    this.slides.slidePrev();
  }

  closeModal(cond){
    this.log.sendEvent('Intro Slide: Closed', 'Intro Slides Modal', 'Condition (pass at start, or close at end): '+cond);
    this.viewCtrl.dismiss();
  }

  //Open the faqs and support modal
  learnMore(){
    this.log.sendEvent('Learn More: Visit FAQ', 'Intro Slides Modal', '');
    const supportModal = this.modal.create('SupportModalPage');
    supportModal.present();
    this.viewCtrl.dismiss();
  }



}
