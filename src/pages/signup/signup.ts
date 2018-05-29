import { Component } from '@angular/core';
import { IonicPage, NavController, AlertController } from 'ionic-angular';
import { Validators, FormBuilder, FormGroup } from '@angular/forms';
import { ApiServiceProvider } from "../../providers/api-service/api-service";
import { Storage } from '@ionic/storage';
import * as decode from 'jwt-decode';

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

  constructor(public navCtrl: NavController, private API: ApiServiceProvider, public alertCtrl: AlertController, private formBuilder: FormBuilder, private storage: Storage) {

    //Form controls and validation
    this.signupForm = this.formBuilder.group({
      name: [
        '', Validators.compose([
          Validators.required,
          Validators.pattern('[a-zA-Z][a-zA-Z ]+')
        ])
      ],
      phone: [
        '', Validators.compose([
          Validators.required,
          Validators.pattern('[0-9 ()-]*'),
          Validators.maxLength(14)
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
      ]
    });
  }

  ionViewDidEnter(){
    this.storage.get('eatiblUser').then((val) => {
      if(val){
        this.user = decode(val);
        this.signupForm.controls['name'].setValue(this.user.name);
        this.signupForm.controls['phone'].setValue(this.user.phone);
        this.signupForm.controls['email'].setValue(this.user.email);
      }
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
    //make API call to get token if successful, or status 401 if login failed
    this.API.makePost('register', this.signupForm.value).subscribe(response => {
      console.log(response)
      var title;
      var message;
      this.response = response;
      if(this.response.message == 'success'){
        this.storage.set('eatiblUser',this.response.token).then((val) => {
          title = 'Account created';
          message = 'Your account has been created!';
          this.presentSuccessAlert(title, message);
        });
      }
      if(this.response.message == 'email taken'){
        title = 'Email Taken';
        message = 'This email is already associated with an account. Please choose a different email or log in.';
        this.presentAlert(title, message);
      }
      if(this.response.message == 'error'){
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
      buttons: ['Dismiss']
    });
    alert.present();
  }

  presentSuccessAlert(title, message){
    let alert = this.alertCtrl.create({
      title: title,
      message: message,
      buttons: ['Dismiss']
    });
    alert.present();
    alert.onDidDismiss(() => {
      this.navCtrl.pop();
    });
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad LoginPage');
  }

}
