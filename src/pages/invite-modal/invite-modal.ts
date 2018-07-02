import { Component } from '@angular/core';
import {IonicPage, NavController, NavParams, AlertController} from 'ionic-angular';
import { Contacts, Contact, ContactField, ContactName } from '@ionic-native/contacts';
import { Validators, FormBuilder, FormGroup } from '@angular/forms';
import { SMS } from '@ionic-native/sms';
import { AndroidPermissions } from '@ionic-native/android-permissions';
import * as _ from 'underscore';

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
  contactList: any;
  allContacts = {} as any;
  inviteList = [];

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private contacts: Contacts,
    private androidPermissions: AndroidPermissions,
    private formBuilder: FormBuilder,
    private sms: SMS,
    private alertCtrl: AlertController,
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

  //Manually add contacts to the invitee list
  addManually(){
    let alert = this.alertCtrl.create({
      title: 'Add Contact',
      inputs: [
        {
          name: 'name',
          placeholder: 'Name'
        },
        {
          name: 'phone',
          placeholder: 'Phone Number',
          type: 'tel'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Add Contact',
          handler: data => {
            var number = data.phone.replace(/\D/g,''); //Strip all non digits
            number = number.replace(/^1/, ''); //Strip the leading 1
            this.inviteList.push({name: data.name, phone: number})
          }
        }
      ]
    });
    alert.present();
  }

  //Browse the phone's contacts to add to the invitee list
  browseContacts(){
    var current = this;

    this.androidPermissions.requestPermissions([this.androidPermissions.PERMISSION.READ_CONTACTS, this.androidPermissions.PERMISSION.SEND_SMS]).then(
      result => {
        current.contacts.find(['displayName', 'name', 'phoneNumbers', 'emails'], {filter: "", multiple: true})
          .then(data => {
            //Initialize alert
            let alert = current.alertCtrl.create();
            alert.setTitle('Import Contacts');

            //Sort returned list of contacts by name
            current.allContacts = _.sortBy(data, function(contact){
              return contact.name.formatted;
            });

            //Process each contact to add as a checkbox for import
            for(var i = 0; i < current.allContacts.length; i++){
              (function(contact){
                console.log(contact)
                var phoneNumbers = [];

                //Loop through all the phonenumbers for each contact
                if(contact.phoneNumbers){ //Only loop through phonenumbers if there are any
                  for(var a = 0; a < contact.phoneNumbers.length; a++){
                    var number = contact.phoneNumbers[a].value.replace(/\D/g,''); //Strip all non digits
                    number = number.replace(/^1/, ''); //Strip the leading 1

                    if(number.length == 10) //Only add number if it is the correct length
                      phoneNumbers.push(number);
                  }

                  phoneNumbers = _.uniq(phoneNumbers); //Filter down to only unique numbers
                  contact.phoneNumbers = phoneNumbers;

                  if(phoneNumbers.length) //If there are phone numbers, add the checkbox input to the alert
                    alert.addInput({
                      type: 'checkbox',
                      label: contact.name.formatted,
                      value: contact
                    });
                }
              }(current.allContacts[i]));
            }

            alert.addButton('Cancel');
            alert.addButton({
              text: 'Import',
              handler: (data: any) => {
                for(var i = 0; i < data.length; i++){
                  current.inviteList.push({name: data[i].name.formatted, phone: data[i].phoneNumbers[data[i].phoneNumbers.length - 1]})
                }
              }
            });

            alert.present();
          });
      },
      err => console.log('need permission')
    );
  }

  submitContact(){
    this.inviteList.push({name: this.addContactForm.value.name, phone: this.addContactForm.value.phone})
  }

  removeContact(index){
    this.inviteList.splice(index, 1);
  }

  //Format phone number to be more readable
  formatPhone(number){
    var s2 = (""+number).replace(/\D/g, '');
    var m = s2.match(/^(\d{3})(\d{3})(\d{4})$/);
    return (!m) ? null : "(" + m[1] + ") " + m[2] + "-" + m[3];
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad InviteModalPage');
  }

}
