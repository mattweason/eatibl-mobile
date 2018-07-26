import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ViewController, Events } from 'ionic-angular';
import { Platform } from 'ionic-angular';
import { ActivityLoggerProvider } from "../../providers/activity-logger/activity-logger";

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
  hideScreen = false; //Sets opacity to 0 when true so that map shows

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private platform: Platform,
    public events: Events,
    public viewCtrl: ViewController,
    private log: ActivityLoggerProvider
  ) {
    //Disable back button dismiss on android
    this.backButtonUnregister = platform.registerBackButtonAction(() => {});

    //Close the modal when we receive the geolocation
    events.subscribe('reveal:restaurants', () => {
      setTimeout(() => {
        this.viewCtrl.dismiss();
      }, 500);
    });

    //Move other map out of the way when position map is opened
    events.subscribe('view:positionMap', (mapOpen) => {
      if(mapOpen)
        this.viewCtrl.dismiss();
    });
  }

  ionViewDidLoad() {
    this.log.sendEvent('Loading Restaurant: Start', 'Intro Load Modal', '');
    console.log('ionViewDidLoad InitialLoadModalPage');
  }

  ionViewWillLeave() {
    this.log.sendEvent('Loading Restaurant: End', 'Intro Load Modal', '');
    this.backButtonUnregister();
  }

}
