import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { Validators, FormBuilder, FormGroup } from '@angular/forms';
import { Platform } from 'ionic-angular';

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
    private platform: Platform
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

}
