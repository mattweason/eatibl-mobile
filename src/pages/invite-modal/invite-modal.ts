import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { Contacts, Contact, ContactField, ContactName } from '@ionic-native/contacts';
import { Validators, FormBuilder, FormGroup } from '@angular/forms';
import { SMS } from '@ionic-native/sms';
import { AndroidPermissions } from '@ionic-native/android-permissions';

/**
 * Generated class for the InviteFriendsPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-invite-modal',
  templateUrl: 'invite-modal.html',
})
export class InviteModalPage {

  addContactForm: FormGroup;
  inviteList = [
    {
      name: 'Matt',
      phone: '416312093'
    },
    {
      name: 'Shayan',
      phone: '416312093'
    }
  ];

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private contacts: Contacts,
    private androidPermissions: AndroidPermissions,
    private formBuilder: FormBuilder,
    private sms: SMS
  ) {
    //Form controls and validation
    this.addContactForm = this.formBuilder.group({
      name: [
        '', Validators.compose([
          Validators.required,
          Validators.pattern('[a-zA-Z \-]+')
        ])
      ],
      phone: [
        '', Validators.compose([
          Validators.required,
          Validators.pattern('[0-9 ()+-]*')
        ])
      ]
    });
  }

  submitContact(){
    this.inviteList.push({name: this.addContactForm.value.name, phone: this.addContactForm.value.phone})
  }

  removeContact(index){
    this.inviteList.splice(index, 1);
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad InviteModalPage');
  }

}
