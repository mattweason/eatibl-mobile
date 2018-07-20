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
  mapView = false;
  hideHelp = false;
  watch: any; //Holds watch position subscription

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


        // platform.resume.subscribe(() => { //TODO: REVIEW THIS BEFORE FINISH GEOLOCATION REWORK
        //   console.log('app resumed')
        //   //Check for both permissions and if location services are enabled
        //   if(platform.is('android'))
        //     this.locationPermissionAndroid();
        //   else if(platform.is('ios'))
        //     this.locationPermissionIos();
        // });

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

    //If the set position map is open hide the help button
    events.subscribe('view:positionMap', (mapOpen) => {
      this.hideHelp = mapOpen;
    });

    //Sends the users location to a child component when requested
    events.subscribe('get:geolocation', (time) => {
      this.sendGeolocationEvent();
    });

    //Sends the users location to a child component when requested
    events.subscribe('get:geolocation:autolocate', () => {
      this.androidPermissions.checkPermission(this.androidPermissions.PERMISSION.ACCESS_COARSE_LOCATION).then(result => {
        if(result)
          this.diagnostic.isLocationEnabled().then((state) => {
            if(state){
              if(this.location)
                this.sendGeolocationEvent();
              else
                this.geolocateUser();
            } else {
              let alert = this.alertCtrl.create({
                title: 'Location Services Are Off',
                subTitle: 'To auto locate you must turn your on your location services.',
                enableBackdropDismiss: false,
                buttons: ['Dismiss']
              });
              alert.present();
            }
          });
        else {
          let alert = this.alertCtrl.create({
            title: 'Lacking Permissions',
            subTitle: 'To auto locate you must give Eatibl permission to get your location.',
            enableBackdropDismiss: false,
            buttons: ['Dismiss']
          });
          alert.present();
        }
      });
    });

    //Listens to whether the user in on the map view or not to move the help button
    events.subscribe('view:map', (onMap) => { //onMap is true if the user is on the map view
      this.mapView = onMap;
    });
  }

  //Open the support modal
  supportModal(){
    const supportModal = this.modal.create('SupportModalPage');
    supportModal.present();
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
              //Do we already have a custom location?
              this.storage.get('eatiblLocation').then((val) => {
                if (val)  //Custom location has been set, set userCoords to custom value
                  this.events.publish('user:geolocated', val, Date.now());
                else
                  this.geolocateUser(); //If state is true, get the geolocation
              });
            } else {
              //Do we already have a custom location?
              this.storage.get('eatiblLocation').then((val) => {
                if (val)  //Custom location has been set, set userCoords to custom value
                  this.events.publish('user:geolocated', val, Date.now());
                else
                  this.presentLocationModal(); //If location is not enabled, ask them to set a custom one
              });
            }
          }).catch(err => console.log(err))
        } else { //We don't have permission

          //Do we already have a custom location?
          this.storage.get('eatiblLocation').then((val) => {
            if(val)  //Custom location has been set, set userCoords to custom value
              this.events.publish('user:geolocated', val, Date.now());
            else{
              this.presentLocationModal();
            }
          });
        }
      },
      err => {
        console.log('error getting permission')
      }
    );
  }

  //Preset custom location modal
  presentLocationModal(){
    this.events.publish('view:positionMap', true); //Get tabs page to set opacity to 0
    const mapModal = this.modal.create('SetPositionModalPage', {location: ['43.659870', '-79.390580']});
    mapModal.onDidDismiss((locationUpdated) => {
      this.events.publish('view:positionMap', false); //Get tabs page to set opacity to 1

      if(locationUpdated) //Did user update the location in the modal
        this.storage.get('eatiblLocation').then((val) => { //If so get the new location and get new ranked list of restaurants
          if(val)  //Custom location has been set, set userCoords to custom value
            this.events.publish('user:geolocated', val, Date.now());
        });
    });
    mapModal.present();
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
    const loadingModal = this.modal.create('InitialLoadModalPage');
    loadingModal.present();
  }

  //Get and watch the users location
  geolocateUser(){
    //Open loading restaurants modal

    //Request geolocation
    this.geolocation.getCurrentPosition({timeout: 15000}).then((resp) => {
      this.location = resp;
      this.sendGeolocationEvent();

      //Set up an observable for child components/pages to watch for geolocation data
      let watch = this.geolocation.watchPosition({maximumAge: 30000});
      watch.subscribe((data) => {
        this.location = data;
        this.sendGeolocationEvent();
      });
    }).catch((error) => {
      let alert = this.alertCtrl.create({
        title: "Can't Find You",
        message: "We're having trouble getting your location. Do you want to try again or set your location on a map?",
        buttons: [
          {
            text: 'Set Location',
            handler: () => {
              this.presentLocationModal();
            }
          },
          {
            text: 'Try Again',
            handler: () => {
              this.geolocateUser();
            }
          }
        ]
      });
      alert.present();
    });
  }

  //Push event every time the users geolocation is created or updated
  sendGeolocationEvent() {
    this.storage.get('eatiblLocation').then((val) => {
      if(this.location && !val) { //Only send location back if you have it and there is no custom location
        console.log('custom location cleared')
        if (this.location.coords) { //Only send location if it has coordinates
          this.events.publish('user:geolocated', [this.location.coords.latitude, this.location.coords.longitude], Date.now());
        }
      }
    });
  }
}
