import { Component } from '@angular/core';
import {IonicPage, NavController, Events, ModalController, Platform} from 'ionic-angular';
import { Validators, FormBuilder, FormGroup } from '@angular/forms';
import { ApiServiceProvider } from "../../providers/api-service/api-service";
import { ActivityLoggerProvider } from "../../providers/activity-logger/activity-logger";
import { FunctionsProvider } from '../../providers/functions/functions';
import { Device } from '@ionic-native/device';
import {UserServiceProvider} from "../../providers/user-service/user-service";

/**
 * Generated class for the LoginPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-signup',
  templateUrl: 'signup.html',
})
export class SignupPage {

  signupForm: FormGroup;
  response = {} as any;
  submitAttempt = false;
  user: any;
  postObject= {} as any;
  promoCode = {} as any;
  intro = false;
  callback: any;
  mobilePlatform: any;

  constructor(
    public navCtrl: NavController,
    private API: ApiServiceProvider,
    private formBuilder: FormBuilder,
    private device: Device,
    public functions: FunctionsProvider,
    public events: Events,
    private modal: ModalController,
    private userService: UserServiceProvider,
    private log: ActivityLoggerProvider,
    private platform: Platform
  ) {
    //What platform is this?
    if(platform.is('ios'))
      this.mobilePlatform = 'ios';
    if(platform.is('android'))
      this.mobilePlatform = 'android';

    //Form controls and validation
    this.signupForm = this.formBuilder.group({
      name: [
        '', Validators.compose([
          Validators.required
        ])
      ],
      email: [
        '', Validators.compose([
          Validators.required,
          Validators.email
        ])
      ],
      password: [
        '', Validators.compose([
          Validators.required,
          Validators.minLength(8)
        ])
      ],
      promoCode: ''
    });
  }

  signup(){
    if(!this.signupForm.valid){
      Object.keys(this.signupForm.controls).forEach(field => { // {1}
        const control = this.signupForm.get(field);            // {2}
        control.markAsTouched({ onlySelf: true });       // {3}
      });
      this.submitAttempt = true;
    }
    else {
      if(this.signupForm.value.promoCode.length > 0){
        this.API.makePost('promoCode/validate', {promoCode: this.signupForm.value.promoCode}).subscribe(res => {
          if(res['message'] == 'invalid'){
            this.signupForm.controls['promoCode'].setErrors({'incorrect': true});
          } else {
            this.promoCode = res['promoCode'];
          }
        });
      }

      //Cache user object and add device id
      this.postObject = this.signupForm.value;
      this.postObject.deviceId = this.device.uuid;
      if(this.promoCode.length)
        this.postObject.promoCode = this.promoCode['code'];

      this.userService.signup(this.postObject, () => {
        this.navCtrl.pop();
      });
    }
  }

  //Trim the trailing spaces from form input values
  cleanValue(field){
    if(/\s+$/.test(this.signupForm.value[field]))
      this.signupForm.controls[field].setValue(this.signupForm.value[field].trim());
  }

  //Prompt terms of use / privacy policy modal
  openTermsModal(){
    const termsModal = this.modal.create('TermsModalPage');
    termsModal.present();
  }

  //Google Plus login
  loginGoogle(){
    this.userService.loginGoogle(() => {
      this.navCtrl.pop();
    });
  }

  //Facebook login
  loginFacebook(){
    this.userService.loginFacebook(() => {
      this.navCtrl.pop();
    });
  }

  login(){
    this.log.sendEvent('Login Navigated To', 'Sign Up', 'User pressed login button');
    this.navCtrl.push('LoginPage').then(() => {
      var index = this.navCtrl.getActive().index;
      this.navCtrl.remove(index-1);
    });
  }

}
