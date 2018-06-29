import { Component } from '@angular/core';
import { Platform } from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';
import { Geolocation } from '@ionic-native/geolocation';
import { AndroidPermissions } from '@ionic-native/android-permissions';
import { AppVersion } from '@ionic-native/app-version';
import { ApiServiceProvider } from "../providers/api-service/api-service";
import { AlertController, ModalController } from 'ionic-angular';
import { Device } from '@ionic-native/device';
import { Events } from 'ionic-angular';
import { Contacts, Contact, ContactField, ContactName } from '@ionic-native/contacts';
import { SMS } from '@ionic-native/sms';


@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  rootPage:any;
  location: any;

  //Used for android permissions
  hasPermission = false;
  interval: any;
  requestedPermission = false;

  constructor(
    platform: Platform,
    statusBar: StatusBar,
    public splashScreen: SplashScreen,
    private geolocation: Geolocation,
    private androidPermissions: AndroidPermissions,
    private appVersion: AppVersion,
    private alertCtrl: AlertController,
    private API: ApiServiceProvider,
    public events: Events,
    private device: Device,
    private modal: ModalController
  ) {

    platform.ready().then(() => {
      console.log(Date.now() + ' platform ready')
      this.rootPage = 'TabsPage';
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      statusBar.styleDefault();

      //Only do native stuff in android or ios
      if (platform.is('cordova')){
        var self = this; //Cache this to use in functions
        console.log('Device UUID is: ' + this.device.uuid);
        //check if we need to force update on currently installed version of app ***COMMENTED OUT FOR NOW****
        // appVersion.getVersionNumber().then(function(version_code){
        //   console.log(version_code);
        //   self.API.makePost('versionCheck', {version: version_code}).subscribe(data => {
        //     console.log(data);
        //     if(data['result']){
        //       let alert = self.alertCtrl.create({
        //         title: 'New Version Available',
        //         subTitle: 'There is a required update for Eatibl. Please update and reopen the app.',
        //         enableBackdropDismiss: false,
        //         buttons: [{
        //           text: 'Update'
        //         }]
        //       });
        //       alert.present();
        //     }
        //   });
        // });

        this.androidPermissions.requestPermission(this.androidPermissions.PERMISSION.ACCESS_COARSE_LOCATION).then(
          result => this.geolocateUser(),
          err => console.log('need permission')
        );
        // this.promptReferral();

        //Find out if we need to ask the user for a referral code
        // this.storage.get('eatiblUser').then((user) => { //Check if there is a logged in user
        //   if(!user)
        //     this.storage.get('eatiblDeviceId').then((deviceId) => {//Check if there is a basic device ID user
        //       if(!deviceId)
        //         this.API.makePost('compareDeviceId', {deviceId: this.device.uuid}).subscribe(data => {//Check backend for activated deviceIDs
        //           if(!data.result)
        //             this.promptReferral();
        //         })
        //     });
        // });
      }
      else //Only for ionic lab
        this.geolocateUser();
      this.promptReferral();
    });

    //Sends the users location to a child component when requested
    events.subscribe('get:geolocation', (time) => {
      this.sendGeolocationEvent();
    });
  }

  promptReferral() {
    const referralModal = this.modal.create('ReferralModalPage', {enableBackdropDismiss: false});

    referralModal.present();
  }

  forceUpdate() {
    let alert = this.alertCtrl.create({
      title: 'Low battery',
      subTitle: '10% of battery remaining',
      buttons: ['Dismiss']
    });
    alert.present();
  }

  ngOnInit(){
  }

  //Get and watch the users location
  geolocateUser(){
    this.geolocation.getCurrentPosition({timeout: 30000}).then((resp) => {
      this.splashScreen.hide();
      this.location = resp;
      this.sendGeolocationEvent();

      //Set up an observable for child components/pages to watch for geolocation data
      let watch = this.geolocation.watchPosition({maximumAge: 30000});
      watch.subscribe((data) => {
        this.location = data;
        this.sendGeolocationEvent();
      });
    }).catch((error) => {
      console.log('Error getting location', error);
    });
  }

  //Push event every time the users geolocation is created or updated
  sendGeolocationEvent() {
    if(this.location) //Only send location back if you have it
      if(this.location.coords) { //Only send location if it has coordinates
        this.events.publish('user:geolocated', this.location, Date.now());
      }
  }
}
