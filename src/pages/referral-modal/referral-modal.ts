import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { Validators, FormBuilder, FormGroup } from '@angular/forms';
import { ApiServiceProvider } from "../../providers/api-service/api-service";
import { Platform } from 'ionic-angular';
import { Device } from '@ionic-native/device';

/**
 * Generated class for the ReferralPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-referral-modal',
  templateUrl: 'referral-modal.html',
})
export class ReferralModalPage {

  referralCodeForm: FormGroup;
  referralPhoneForm: FormGroup;
  private backButtonUnregister: any;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private formBuilder: FormBuilder,
    private platform: Platform,
    private API: ApiServiceProvider,
    private device: Device
  ) {
    //Disable back button dismiss on android
    this.backButtonUnregister = platform.registerBackButtonAction(() => {});

    //Form controls and validation
    this.referralCodeForm = this.formBuilder.group({
      code: [
        '', Validators.compose([
          Validators.required,
          Validators.pattern('[a-zA-Z0-9]+')
        ])
      ]
    });

    //Form controls and validation
    this.referralPhoneForm = this.formBuilder.group({
      phone: [
        '', Validators.compose([
          Validators.required,
          Validators.pattern('[0-9 ()+-]*'),
          Validators.maxLength(17)
        ])
      ]
    });
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad ReferralModalPage');
  }

  ionViewWillLeave() {
    this.backButtonUnregister();
  }

  submitPhone(){
    this.API.makePost('comparePhone', {phone: this.referralPhoneForm.value.phone, deviceId: this.device.uuid}).subscribe(data => { //Check backend for phone numbers that have been invited
      if(data['result'])
        console.log('it works');
      else
        console.log('nothing...');
    })
  }

  submitCode(){
    //make a post with referral code and deviceId (if it passes, we add deviceID in our whitelist)
    this.API.makePost('compareCode', {code: this.referralCodeForm.value.code, deviceId: this.device.uuid}).subscribe(data => { //Check backend for activated deviceIDs
      if(data['result']){
        console.log('it works');
      }
      else
        console.log('Nothing?!');
    })
  }

}
