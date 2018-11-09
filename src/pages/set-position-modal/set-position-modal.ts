import { Component } from '@angular/core';
import {IonicPage, NavController, NavParams, ViewController} from 'ionic-angular';
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
    this.log.sendEvent('Vicinity Selected', 'Set Position Modal', JSON.stringify(this.vicinities[this.vicinityIndex]));
    this.viewCtrl.dismiss();
    this.geolocationService.toggleManualReload(true);
    this.geolocationService.setLocation(this.vicinities[this.vicinityIndex].coords, this.vicinities[this.vicinityIndex].name)
  }

  useDeviceLocation(){
    this.log.sendEvent('Use Device Location button pressed', 'Set Position Modal', '');
    if(!this.geolocationService.location.device){
      this.geolocationService.toggleManualReload(true);
      this.geolocationService.useDeviceLocation((result) => {
        if(result == 1){
          this.log.sendEvent('Use Device Location success', 'Set Position Modal', 'User switched to device location from custom location');
          this.viewCtrl.dismiss();
        } else if(result == 2){
          this.log.sendEvent('Use Device Location success', 'Set Position Modal', 'User switched to device location from custom location');
          this.viewCtrl.dismiss(true);
        }
      });
    }
    else{
      this.log.sendEvent('Use Device Location success', 'Set Position Modal', 'User was already using device location');
      this.viewCtrl.dismiss();
    }
  }

  //Close the modal
  dismiss(){
    this.viewCtrl.dismiss();
  }

}
