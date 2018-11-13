import { Component } from '@angular/core';
import {IonicPage, NavController, NavParams, ViewController} from 'ionic-angular';
import { ActivityLoggerProvider } from "../../providers/activity-logger/activity-logger";

/**
 * Generated class for the TermsModalPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-terms-modal',
  templateUrl: 'terms-modal.html',
})
export class TermsModalPage {

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public viewCtrl: ViewController,
    private log: ActivityLoggerProvider
  ) {
  }

  dismiss(){
    this.log.sendEvent('Terms Modal: Opened', 'Terms Modal', '');
    this.viewCtrl.dismiss();
  }

}
