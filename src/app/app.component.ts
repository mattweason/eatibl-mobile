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
import { Storage } from '@ionic/storage';
import { Firebase } from '@ionic-native/firebase';
import { Diagnostic } from '@ionic-native/diagnostic';
import { LocationAccuracy } from '@ionic-native/location-accuracy';


@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  rootPage:any;
  location: any;

  //Used for android permissions
  hasPermission = false;
  interval: any;

  constructor(
    private platform: Platform,
    statusBar: StatusBar,
    public splashScreen: SplashScreen,
    private geolocation: Geolocation,
    private androidPermissions: AndroidPermissions,
    private appVersion: AppVersion,
    private alertCtrl: AlertController,
    private API: ApiServiceProvider,
    public events: Events,
    private device: Device,
    private modal: ModalController,
    private storage: Storage,
    private firebase: Firebase,
    private diagnostic: Diagnostic,
    private locationAccuracy: LocationAccuracy
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


        platform.resume.subscribe(() => {
          //Check for both permissions and if location services are enabled
          if(platform.is('android'))
            this.locationPermissionAndroid();
          else if(platform.is('ios'))
            this.locationPermissionIos();
        });

        this.firebase.getToken()
          .then(token => console.log(`The token is ${token}`)) // save the token server-side and use it to push notifications to this device
          .catch(error => console.error('Error getting token', error));

        this.firebase.onTokenRefresh()
          .subscribe((token: string) => console.log(`Got a new token ${token}`));

        //Check for both permissions and if location services are enabled
        if(platform.is('android'))
          this.locationPermissionAndroid();
        else if(platform.is('ios'))
          this.locationPermissionIos();
      }
      else //Only for ionic lab
        this.geolocateUser();

    });

    //Sends the users location to a child component when requested
    events.subscribe('get:geolocation', (time) => {
      this.sendGeolocationEvent();
    });
  }

  //Alert to prompt user to enable location services ios
  enableLocationIos(){
    const current = this; //Cache this
    let alert = this.alertCtrl.create({
      title: 'Allow location services',
      subTitle: 'Eatibl needs location services to work. Please allow Eatibl to access your location services.',
      enableBackdropDismiss: false,
      buttons: [
        {
          text: 'Allow',
          handler: () => {
            this.diagnostic.switchToSettings().then(() => { //Open app specific settings page
              console.log('switched to settings')
            });
          }
        }]
    });
    alert.present();
  }

  //Run geolocation permissions for iOs
  locationPermissionIos(){
    this.splashScreen.hide();
    this.diagnostic.getLocationAuthorizationStatus().then((status) => {
      if(status == 'not_determined') //Permission has not yet been asked
        this.diagnostic.requestLocationAuthorization().then((status) => {
          if(status == 'authorized_when_in_use' || status == 'authorized_always') //Permission has been authorized
            this.geolocateUser();
          else if(status == 'denied') //Permission has been denied
            this.enableLocationIos();
        });
      else if(status == 'denied') //Permission has been denied
        this.enableLocationIos();
      else if(status == 'authorized_when_in_use' || status == 'authorized_always') //Permission has been authorized
        this.geolocateUser();
    })
  }

  //Run geolocation permissions and availability checks for android
  locationPermissionAndroid(){
    this.splashScreen.hide();
    this.androidPermissions.requestPermission(this.androidPermissions.PERMISSION.ACCESS_COARSE_LOCATION).then(
      result => {
        if(result.hasPermission){ //We have permission
          this.diagnostic.isLocationEnabled().then((state) => {
            if (state) {
              this.geolocateUser(); //If state is true, get the geolocation
            } else {
              this.locationEnabledAndroid(); //If state is false, prompt native dialog to enable
            }
          }).catch(err => console.log(err))
        } else { //We don't have permission
          const current = this; //Cache this
          let alert = this.alertCtrl.create({
            title: 'Allow location services',
            subTitle: 'Eatibl needs location services to work. Please allow Eatibl to access your location services.',
            enableBackdropDismiss: false,
            buttons: [
              {
                text: 'Close App',
                handler: () => {
                  current.platform.exitApp();
                }
              },
              {
                text: 'Allow',
                handler: () => {
                  current.locationPermissionAndroid(); //Rerun function to prompt permission request again
                }
              }]
          });
          alert.present();
        }
      },
      err => {
        console.log('error getting permission')
      }
    );
  }

  //Prompt native dialog to turn on location services android
  locationEnabledAndroid(){
    this.locationAccuracy.canRequest().then((canRequest: boolean) => {
      if (canRequest) {
        // the accuracy option will be ignored by iOS
        this.locationAccuracy.request(this.locationAccuracy.REQUEST_PRIORITY_HIGH_ACCURACY).then(
          () => this.geolocateUser(),
          error => {
            var current = this; //Cache this
            let alert = this.alertCtrl.create({
              title: 'Enable location services',
              subTitle: 'Eatibl needs location services to work. Please enable your location services.',
              enableBackdropDismiss: false,
              buttons: [
                {
                  text: 'Close App',
                  handler: () => {
                    current.platform.exitApp();
                  }
                },
                {
                  text: 'Enable',
                  handler: () => {
                    current.locationEnabledAndroid(); //Rerun function to prompt native enable dialog again
                  }
                }]
            });
            alert.present();
          }
        );
      }
    });
  };

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
    //Open loading restaurants modal
    const loadingModal = this.modal.create('InitialLoadModalPage');
    loadingModal.present();

    //Request geolocation
    this.geolocation.getCurrentPosition({timeout: 30000}).then((resp) => {
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
