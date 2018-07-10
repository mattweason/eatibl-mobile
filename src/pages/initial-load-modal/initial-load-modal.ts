import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ViewController, Events } from 'ionic-angular';
import { Platform } from 'ionic-angular';

/**
 * Generated class for the InitialLoadModalPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-initial-load-modal',
  templateUrl: 'initial-load-modal.html',
})
export class InitialLoadModalPage {
  private backButtonUnregister: any;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private platform: Platform,
    public events: Events,
    public viewCtrl: ViewController
  ) {
    //Disable back button dismiss on android
    this.backButtonUnregister = platform.registerBackButtonAction(() => {});

    //Close the modal when we receive the geolocation
    events.subscribe('reveal:restaurants', () => {
      setTimeout(() => {
        this.viewCtrl.dismiss();
      }, 500);
    });
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad InitialLoadModalPage');
  }

  ionViewWillLeave() {
    this.backButtonUnregister();
  }

}
