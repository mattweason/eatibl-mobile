import { Component } from '@angular/core';
import {IonicPage, NavController, NavParams, ViewController, ToastController, Events} from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { ActivityLoggerProvider } from "../../providers/activity-logger/activity-logger";
import * as _ from 'underscore';
import {ApiServiceProvider} from "../../providers/api-service/api-service";
import {GeolocationServiceProvider} from "../../providers/geolocation-service/geolocation-service";

/**
 * Generated class for the SetPositionModalPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-set-position-modal',
  templateUrl: 'set-position-modal.html',
})
export class SetPositionModalPage {

  loading = false;
  vicinities: any;
  vicinityIndex: any;

  constructor(
    public navCtrl: NavController,
    public viewCtrl: ViewController,
    public navParams: NavParams,
    private storage: Storage,
    private params: NavParams,
    private events: Events,
    private toastCtrl: ToastController,
    private API: ApiServiceProvider,
    private log: ActivityLoggerProvider,
    private geolocationService: GeolocationServiceProvider
  ) {

    this.API.makeCall('vicinity/all').subscribe((vicinities) => {
      this.sortVicinities(vicinities)
    })
  }

  ionViewDidLoad() {

  }

  sortVicinities(vicinities){
    var filteredVicinities = _.filter(vicinities, function(vicinity){
      return vicinity.count > 1;
    });
    this.vicinities = _.sortBy(filteredVicinities, function(vicinity){
      return vicinity.name;
    });
  }

  selectVicinity(){
    this.viewCtrl.dismiss();
    this.geolocationService.toggleManualReload(true);
    this.geolocationService.setLocation(this.vicinities[this.vicinityIndex].coords, this.vicinities[this.vicinityIndex].name)
  }

  useDeviceLocation(){
    this.viewCtrl.dismiss();
    this.geolocationService.toggleManualReload(true);
    this.geolocationService.useDeviceLocation();
  }

  //Close the modal
  dismiss(){
    this.viewCtrl.dismiss();
    this.log.sendEvent('Set Position Modal: Closed', 'Set Position Modal', 'Did they update the info: '); //TODO: give this info
  }

}
