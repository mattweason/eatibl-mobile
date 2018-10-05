import { Component } from '@angular/core';
import {IonicPage, NavController, NavParams, ViewController, AlertController, ModalController} from 'ionic-angular';
import {Validators, FormGroup, FormBuilder} from "@angular/forms";
import { ActivityLoggerProvider } from "../../providers/activity-logger/activity-logger";
import { ApiServiceProvider } from "../../providers/api-service/api-service";
import { Storage } from '@ionic/storage';
import * as decode from 'jwt-decode';
import { Device } from '@ionic-native/device';

/**
 * Generated class for the SupportModalPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-support-modal',
  templateUrl: 'support-modal.html',
})
export class SupportModalPage {
  type = 'faq';
  faqs = [];
  user: any;
  supportForm: FormGroup;
  submitAttempt = false;
  postObject = {} as any;


  constructor(
    public navCtrl: NavController,
    public viewCtrl: ViewController,
    private formBuilder: FormBuilder,
    private device: Device,
    private storage: Storage,
    private modal: ModalController,
    private API: ApiServiceProvider,
    private alertCtrl: AlertController,
    public navParams: NavParams,
    private log: ActivityLoggerProvider
  ) {
    //Form content and validation for support form
    this.supportForm = this.formBuilder.group({
      name: [
        '', Validators.compose([
          Validators.required,
          Validators.pattern('[a-zA-Z][a-zA-Z ]+')
        ])
      ],
      email: [
        '', Validators.compose([
          Validators.required,
          Validators.email
        ])
      ],
      message: [
        '', Validators.required
      ]
    });

    //Faq list
    this.faqs = [
      {
        question: '1. What is Eatibl?',
        answer: 'Eatibl is a discounted restaurant booking platform offering real-time savings of up to 50% off the whole food bill for every restaurant any time of the day, everyday! ',
        open: false
      },
      {
        question: '2. Is Eatibl Free to Use?',
        answer: 'Yep! There are absolutely no costs to using our services, and we’ll never ask for your credit card information. The only thing you pay for is your *discounted* bill at the restaurant.',
        open: false
      },
      {
        question: '3. What is included in the discount?',
        answer: 'The discount applies to all regularly priced food items on the menu. But it does NOT include alcoholic beverages and already discounted menu items (like daily specials). Also please keep in mind that our restaurants have the ability to list their own special conditions, so make sure to take a look at the restaurant details before making your booking!',
        open: false
      },
      {
        question: '4. How do I make a booking?',
        answer: `Find a restaurant you would like to eat at in the Nearby or Search tabs. Click through to that restaurant's page and select which discount you would like to have. Make sure to select the number of people you would like the booking to serve and press “Book Now.” Enter your name along with a valid mobile number and email and press "confirm".`,
        open: false
      },
      {
        question: '5. Can I change my booking once it’s confirmed?',
        answer: 'You can cancel your booking up to 30 minutes before the booking time. Editing your booking is not possible within Eatibl since availability and discounts vary based on time and day. So if you’d like to rearrange your plans for another time, simply cancel your existing booking and create a new one based on the current availability.',
        open: false
      },
      {
        question: '6. How does the restaurant know about my discounted booking?',
        answer: 'Upon arriving at the restaurant, just let them know you’ve made a booking through Eatibl and show them your booking confirmation through the app. They will confirm the booking on their end and apply the discount at the end of your meal. It’s that easy!',
        open: false
      },
      {
        question: '7. How long in advance can I make a booking?',
        answer: 'You can reserve a table up to 1 month in advance!',
        open: false
      },
      {
        question: '8. What happens if I’m late to the restaurant?',
        answer: 'Restaurants will honor your deal for upto 15 minutes past the booking time. But after that point, it’s up to the individual restaurant whether to honor your booking or not.',
        open: false
      },
      {
        question: '9. What happens if I’m early to the restaurant?',
        answer: 'Restaurants can choose to seat you at an earlier time at their discretion. But they also have the option to wait until the specified booking time.',
        open: false
      },
      {
        question: '10. What happens if a time-slot is not available?',
        answer: 'If a time-slot is not available it could mean either the restaurant is not servicing during those hours or that all the tables have been booked already. If the tables have already been booked, don’t worry! You can always keep checking as there are cancellations that happen last minute.',
        open: false
      },
      {
        question: '11. What happens if I miss a booking?',
        answer: 'We understand that sometimes things don’t pan out as planned. But we also expect our users to do their best to follow through with their bookings. Isolated incidents of unfulfilled bookings are fine, but we do reserve the right to suspend or ban users who have a pattern of not honoring their bookings.',
        open: false
      },
      {
        question: '12. How many bookings can I make?',
        answer: 'You can have upto 3 active bookings at any given time.',
        open: false
      },
      {
        question: '13. Why do you need to validate my phone number?',
        answer: 'This is to make sure that we discourage anonymous users from making fake bookings. If you’re making fake bookings we’ll text you a sad-face emoticon :(',
        open: false
      }
    ]
  }

  //Open the intro slides
  viewIntro(type){
    const introModal = this.modal.create('IntroSlidesPage', {type: type});
    this.log.sendEvent('Intro slides', 'FAQ', 'Pressed Intro slides button from within Modal');
    introModal.onDidDismiss(() => {});
    introModal.present();
  }

  ionViewDidEnter(){
    this.storage.get('eatiblUser').then((val) => {
      if(val){
        this.user = decode(val);
        this.supportForm.controls['name'].setValue(this.user.name);
        this.supportForm.controls['email'].setValue(this.user.email);
      }
    });
  }

  //Close the modal
  dismiss(){
    this.log.sendEvent('Support Modal: Closed', 'Support Modal', '');
    this.viewCtrl.dismiss();
  }

  //Submit the contact us form
  requestSupport(){
    this.log.sendEvent('Request Support: Attempted', 'Support Modal', 'Tried to make a support submission');
    if(!this.submitAttempt){ //Don't submit form twice
      if(!this.supportForm.valid){
        Object.keys(this.supportForm.controls).forEach(field => { // {1}
          const control = this.supportForm.get(field);            // {2}
          control.markAsTouched({ onlySelf: true });       // {3}
        });
        this.submitAttempt = true;
      }

      //Cache user object and add device id
      this.postObject = this.supportForm.value;
      if(this.user)
        this.postObject.user_fid = this.user._id;
      this.postObject.deviceData = {
        id: this.device.uuid,
        model: this.device.model,
        version: this.device.version,
        platform: this.device.platform,
        manufacturer: this.device.manufacturer
      };

      this.API.makePost('support/submit', this.postObject).subscribe(response => {
        if(response){
          this.log.sendEvent('Request Support: Completed', 'Support Modal', 'Successfully sent out support request');
          this.submitAttempt = false;
          let alert = this.alertCtrl.create({
            title: 'Message Sent',
            message: 'Thank you for your feedback! We will get in touch with you soon.',
            buttons: [
              {
                text: 'Close',
                handler: () => {
                  this.viewCtrl.dismiss();
                }
              }
            ]
          });
          alert.present();
        }

      });
    }
  }

  toggleSection(i){
    this.log.sendEvent('FAQ Section: Toggle FAQ-'+i, 'Support Modal', 'Open/close QnA');
    this.faqs[i].open = !this.faqs[i].open;
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad SupportModalPage');
  }

}
