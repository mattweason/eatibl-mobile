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

@Component({
  selector: 'page-signup',
  templateUrl: 'signup.html',
})
export class SignupPage {

  signupForm: FormGroup;

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
          Validators.pattern('[a-zA-Z0-9.-]{1,}@[a-zA-Z.-]{2,}[.]{1}[a-zA-Z]{2,}')
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

  signup(){
    //make API call to get token if successful, or status 401 if login failed
    this.API.makePost('register', this.signupForm.value).subscribe(response => {

      if(!response.message)
        this.storage.set('user',response).then((val) => {
          console.log(val);
          console.log(decode(val));
        });
      if(response.message)
        console.log(response.message);

      //BELOW CODE FOR OUTPUTTING USER INFO

      //this.storage.get('user').then((val) => {
      //  var currentUser = val;
      //  console.log(currentUser);
      //  console.log(decode(currentUser));
      //});
    });
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad LoginPage');
  }

}
