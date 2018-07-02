import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ViewController } from 'ionic-angular';
import { Validators, FormBuilder, FormGroup } from '@angular/forms';
import { ApiServiceProvider } from "../../providers/api-service/api-service";
import { Platform, AlertController  } from 'ionic-angular';
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
  codeSubmitted = false;
  codeButtonColor: string = 'secondary';
  codeSuccess = false;
  phoneSubmitted = false;
  phoneButtonColor: string = 'secondary';
  phoneSuccess = false;
  private backButtonUnregister: any;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private formBuilder: FormBuilder,
    private platform: Platform,
    private API: ApiServiceProvider,
    private device: Device,
    private viewCtrl: ViewController,
    private alertCtrl: AlertController
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
    if(this.referralPhoneForm.value.phone != ''){
      this.phoneSubmitted = true;
      this.API.makePost('comparePhone', {phone: this.referralPhoneForm.value.phone, deviceId: this.device.uuid}).subscribe(data => { //Check backend for phone numbers that have been invited
        if(data['result']){
          this.phoneSubmitted = false;
          this.phoneSuccess = true;
          this.phoneButtonColor = 'tertiary';
          var current = this;
          setTimeout(function(){
            current.viewCtrl.dismiss();
          }, 1000);
        }
        else{
          this.phoneSubmitted = false;
          let alert = this.alertCtrl.create({
            title: 'Phone Number Not Found',
            subTitle: 'This phone number is not associated with an active referral.',
            buttons: ['Dismiss']
          });
          alert.present();
        }
      })
    }
  }

  submitCode(){
    if(this.referralCodeForm.value.code != ''){
      this.codeSubmitted = true;
      //make a post with referral code and deviceId (if it passes, we add deviceID in our whitelist)
      this.API.makePost('compareCode', {code: this.referralCodeForm.value.code, deviceId: this.device.uuid}).subscribe(data => { //Check backend for activated deviceIDs
        if(data['result'] == 'valid'){
          this.codeSubmitted = false;
          this.codeSuccess = true;
          this.codeButtonColor = 'tertiary';
          var current = this;
          setTimeout(function(){
            current.viewCtrl.dismiss();
          }, 1000);
        }
        else if(data['result'] == 'invalid'){
          this.codeSubmitted = false;
          let alert = this.alertCtrl.create({
            title: 'Referral Code Not Found',
            subTitle: 'This referral code is not valid.',
            buttons: ['Dismiss']
          });
          alert.present();
        }
        else if(data['result'] == 'limit'){
          this.codeSubmitted = false;
          let alert = this.alertCtrl.create({
            title: 'Referral Code Limit Reached',
            subTitle: 'The usage limit on this referral code has been reached.',
            buttons: ['Dismiss']
          });
          alert.present();
        }
      })
    }
  }

}
