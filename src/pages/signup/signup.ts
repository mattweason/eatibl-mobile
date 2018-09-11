import { Component } from '@angular/core';
import {IonicPage, NavController, AlertController, Events, ModalController} from 'ionic-angular';
import { Validators, FormBuilder, FormGroup } from '@angular/forms';
import { ApiServiceProvider } from "../../providers/api-service/api-service";
import { ActivityLoggerProvider } from "../../providers/activity-logger/activity-logger";
import { Storage } from '@ionic/storage';
import * as decode from 'jwt-decode';
import { Device } from '@ionic-native/device';

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

  constructor(
    public navCtrl: NavController,
    private API: ApiServiceProvider,
    public alertCtrl: AlertController,
    private formBuilder: FormBuilder,
    private device: Device,
    private storage: Storage,
    public events: Events,
    private modal: ModalController,
    private log: ActivityLoggerProvider
  ) {

    //Form controls and validation
    this.signupForm = this.formBuilder.group({
      name: [
        '', Validators.compose([
          Validators.required
        ])
      ],
      phone: [
        '', Validators.compose([
          Validators.required,
          Validators.pattern('[0-9 ()+-]*')
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

  ionViewDidEnter(){
    this.storage.get('eatiblUser').then((val) => {
      if(val){
        this.user = decode(val);
        if(this.user.phone){
          this.signupForm.controls['name'].setValue(this.user.name);
          this.signupForm.controls['phone'].setValue(this.user.phone);
          this.signupForm.controls['email'].setValue(this.user.email);
        }
      }
    });
  }

  signup(){
    this.log.sendEvent('Signup: Attempted', 'Sign up', 'User has begun sign-up process');
    if(!this.signupForm.valid){
      Object.keys(this.signupForm.controls).forEach(field => { // {1}
        const control = this.signupForm.get(field);            // {2}
        control.markAsTouched({ onlySelf: true });       // {3}
      });
      this.submitAttempt = true;
    }
    else {
      if(this.signupForm.value.promoCode.length > 0)
        this.API.makePost('promoCode/validate', {promoCode: this.signupForm.value.promoCode}).subscribe(res => {
          if(res['message'] == 'invalid'){
            this.signupForm.controls['promoCode'].setErrors({'incorrect': true});
          } else {
            this.promoCode = res['promoCode'];
            this.validateUser(res['promoCode']['code']);
          }
        });
      else
        this.validateUser(false);
    }
  }

  //Validate phone number and process registration object
  validateUser(code){
    //Cache user object and add device id
    this.postObject = this.signupForm.value;
    this.postObject.deviceId = this.device.uuid;
    if(code)
      this.postObject.promoCode = [code];
    // else
    //   delete this.postObject.promoCode;

    //Clean up phone number
    this.postObject.phone = this.postObject.phone.replace(/\D/g, ''); //Strip all non digits
    this.postObject.phone = this.postObject.phone.replace(/^1/, ''); //Strip the leading 1

    this.API.makePost('user/verify/check', this.postObject).subscribe(response => {
      if (response['err']) { //Twilio says invalid phone number
        let title = 'Invalid Phone Number',
          message = 'The number you have entered is incorrect. Please ensure you have entered an accurate, North American phone number.';
        this.presentAlert(title, message);

      } else { //Phone number is good
        var newObj = JSON.parse(JSON.stringify(this.postObject));
        delete newObj.password; //remove password and save data to log
        this.log.sendEvent('Signup: Verification Sent', 'Sign up', 'System has sent SMS to user for verification. Post Object: ' + JSON.stringify(newObj));
        if (response['verify']) //Account needs verification, SMS has been sent
          this.verifyAlert(false);

        else //Account already verified, proceed
          this.submitRegistration();
      }
    });
  }

  //Verification code alert
  verifyAlert(reverify){ //If reverify is true, the user entered a bad code and must reverify
    let title = 'Verify Phone Number',
      message = "We've texted you a verification code. Please enter the code below to complete your registration.";
    if(reverify){
      title = 'Invalid Code';
      message = "The verification code you entered does not match the one sent to you. Please try again.";
    }
    let alert = this.alertCtrl.create({
      title: title,
      message: message,
      inputs: [
        {
          name: 'code',
          placeholder: 'Code',
          type: 'tel'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          handler: data => {
            console.log('Cancel clicked');
          }
        },
        {
          text: 'Submit',
          handler: data => {
            if(data.code){
              const postObj = {
                phone: this.signupForm.value.phone,
                code: data.code
              };
              this.API.makePost('user/verify/confirm', postObj).subscribe(response => {
                if(response['confirmed']) //Code is good :)
                  this.submitRegistration();

                else { //Code is bad :(
                  this.verifyAlert(true);
                }
              });
            }
          }
        }
      ]
    });
    alert.present();
  }

  //Trim the trailing spaces from form input values
  cleanValue(field){
    if(/\s+$/.test(this.signupForm.value[field]))
      this.signupForm.controls[field].setValue(this.signupForm.value[field].trim());
  }

  //Make the api call to submit the registration
  submitRegistration(){

    //make API call to get token if successful, or status 401 if login failed
    this.API.makePost('register', this.postObject).subscribe(response => {
      var newObj = this.postObject; delete newObj.password; //remove password and save data to log
      var title;
      var message;
      this.response = response;
      if(this.response.message == 'success'){
        this.log.sendEvent('Signup: Success', 'Sign up', JSON.stringify(newObj));
        this.storage.set('eatiblUser',this.response.token).then((val) => {
          title = 'Account created';
          if(this.promoCode.code)
            message = "Your account has been created and the "+this.promoCode['promotion']+" promo code has been applied to your account!";
          else
            message = 'Your account has been created!';
          this.presentSuccessAlert(title, message);
          this.events.publish('user:statuschanged');
          this.events.publish('email:captured');
        });
      }
      if(this.response.message == 'email taken'){
        this.log.sendEvent('Signup: Email Taken', 'Sign up', JSON.stringify(newObj));
        title = 'Email Taken';
        message = 'This email is already associated with an account. Please choose a different email or log in.';
        this.presentAlert(title, message);
      }
      if(this.response.message == 'error'){
        this.log.sendEvent('Signup: Error', 'Sign up', JSON.stringify(newObj));
        title = 'Error';
        message = 'There was an error creating your account. Please try again.';
        this.presentAlert(title, message);
      }

      //BELOW CODE FOR OUTPUTTING USER INFO

      //this.storage.get('user').then((val) => {
      //  var currentUser = val;
      //  console.log(currentUser);
      //  console.log(decode(currentUser));
      //});
    });
  }

  presentAlert(title, message){
    let alert = this.alertCtrl.create({
      title: title,
      message: message,
      buttons: ['Ok']
    });
    alert.present();
  }

  presentSuccessAlert(title, message){
    let alert = this.alertCtrl.create({
      title: title,
      message: message,
      buttons: ['Ok']
    });
    alert.present();
    alert.onDidDismiss(() => {
      this.navCtrl.pop();
    });
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad LoginPage');
  }

  //Prompt terms of use / privacy policy modal
  openTermsModal(){
    const termsModal = this.modal.create('TermsModalPage');

    termsModal.present();
  }

}
