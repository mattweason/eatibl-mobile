import { Component } from '@angular/core';
import {IonicPage, NavController, NavParams, AlertController, ViewController} from 'ionic-angular';
import { ApiServiceProvider } from "../../providers/api-service/api-service";
import { ActivityLoggerProvider } from "../../providers/activity-logger/activity-logger";
import * as decode from 'jwt-decode';

/**
 * Generated class for the PromocodeModalPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-promocode-modal',
  templateUrl: 'promocode-modal.html',
})
export class PromocodeModalPage {
  user = {} as any;
  promoCode: string;
  promoRes = '';

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public alertCtrl: AlertController,
    public viewCtrl: ViewController,
    private API: ApiServiceProvider,
    private log: ActivityLoggerProvider
  ) {
    this.user = navParams.get('user');
  }

  submitCode() {
    this.log.sendEvent('PromoCode: Initiated', 'Promocode Modal', 'User pressed promocode button');
    var postObj = {
      userId: this.user._id,
      promoCode: this.promoCode
    };

    if(this.promoCode){
      this.promoCode = this.promoCode.trim();
      this.API.makePost('user/addPromoCode', postObj).subscribe(res => {
        if(res['message'] == 'Invalid Code')
          this.promoRes = 'Invalid promo code.';
        else if(res['message'] == 'Redundant Code')
          this.promoRes = 'Promo code already applied.';
        else if(res['message'] == 'Updated'){
          this.promoCode = '';
          let message = "You've successfully applied the "+res['code']['promotion']+" promo code to your account!",
            title = 'Promo Code Applied';
          this.presentAlert(title, message);
          this.log.sendEvent('PromoCode: Success', 'Account', 'User applied promocode to account');
        }
      });
    }
  }

  //Clear promocode input error
  clearError(){
    this.promoRes = '';
  }

  //Generic alert box
  presentAlert(title, message){
    let alert = this.alertCtrl.create({
      title: title,
      message: message,
      buttons: [{
        text: 'Ok',
        role: 'cancel',
        handler: () => {
          this.viewCtrl.dismiss();
        }
      }]
    });
    alert.present();
  }

  dismiss(){
    this.viewCtrl.dismiss();
  }

}
