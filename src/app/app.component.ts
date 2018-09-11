import {Component, ViewChild} from '@angular/core';
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';
import { Geolocation } from '@ionic-native/geolocation';
import { AndroidPermissions } from '@ionic-native/android-permissions';
import { AppVersion } from '@ionic-native/app-version';
import { ApiServiceProvider } from "../providers/api-service/api-service";
import { ActivityLoggerProvider } from "../providers/activity-logger/activity-logger";
import {AlertController, ModalController, Platform, Events, Nav, MenuController} from 'ionic-angular';
import { Device } from '@ionic-native/device';
import { Storage } from '@ionic/storage';
import { Firebase } from '@ionic-native/firebase';
import { Diagnostic } from '@ionic-native/diagnostic';
import { LocationAccuracy } from '@ionic-native/location-accuracy';
import * as moment from 'moment';
import * as decode from 'jwt-decode';
import { LocalNotifications } from '../../node_modules/@ionic-native/local-notifications';


@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  @ViewChild(Nav) navCtrl: Nav;

  rootPage:any;
  location: any;
  mapView = false;
  watch: any; //Holds watch position subscription
  _autoLocateSub: (location:any, time:any) => void;
  blacklisted = false;
  locationCachedTime: any; //Used to send mark the last time geolocation data was sent to the backend
  user = {
    _id: '',
    email: '',
    name: '',
    phone: '',
    type: ''
  };
  forcedUpdateAlertOpen = false;
  currentTab = 'HomePage';

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
    private log: ActivityLoggerProvider,
    private locationAccuracy: LocationAccuracy,
    public localNotifications: LocalNotifications,
    public menuCtrl: MenuController
  ) {

    platform.ready().then(() => {
      console.log(Date.now() + ' platform ready')
      var dateToday = new Date;
      var dateMoment = moment(dateToday);

      this.rootPage = 'TabsPage';
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      statusBar.styleDefault();

      // firebase.onNotificationOpen()
      //   .subscribe(res => {
      //     if(res.tap) {
      //       // background mode
      //       console.log("background");
      //       console.log(res);
      //     } else if (!res.tap) {
      //       // foreground mode
      //       console.log("foreground");
      //       console.log(res);
      //     }
      //   });

      //Only do native stuff in android or ios
      if (platform.is('cordova')){
        this.log.sendEvent('App Start', 'runTime', '');

        // //Do action if we came into app via localNotification
        this.localNotifications.on('click').subscribe(notification => {
          this.storage.set('eatiblReminder', notification.data);
          this.log.sendEvent('Entered App by Local Notification', 'runTime', JSON.stringify(notification.data));
        })
        //
        // //Check if we already have a re-engage notification and cancel it if we do
        // if(this.localNotifications.isPresent(1)){
        //   this.localNotifications.cancel(1)
        // }
        // //Schedule a new notification for first-timers and regular users
        // this.localNotifications.schedule({
        //   id: 1,
        //   trigger: {at: (dateMoment.add(7, 'days').hours(11).minutes(30)).toDate()},
        //   text: "We're getting new deals everyday, come check out our latest offerings!",
        //   title: "We've missed you...",
        //   icon: 'https://eatibl.com/assets/images/notification-icon.png'
        // });

        this.diagnostic.getLocationAuthorizationStatus().then((status) => {
          if(status == 'not_determined') //track cases where users are required to provide permission
            this.log.sendEvent('Asked Permission', 'runTime', '');
          if(status == 'denied')
            this.log.sendEvent('Loaded without Geolocation', 'runTime', 'User previously declined to give geolocation permission');
          if(status == 'authorized_when_in_use' || status == 'authorized_always')
            this.log.sendEvent('Loaded with Geolocation', 'runTime', 'User previously granted geolocation permission');

        });

        //check if user is logged in
        this.storage.get('eatiblUser').then((val) => {
          if(val){
            this.user = decode(val);
            this.log.sendEvent('Loaded: User Data', 'runTime', JSON.stringify(this.user));
          }
          else
            this.log.sendEvent('Loaded: Unregistered User', 'runTime', "User isn't logged in");
        });

        //Run force update
        // this.forceUpdate();

        platform.pause.subscribe(() => {
          this.log.sendEvent('App Instance Paused', 'unknown', 'The user put the app into the background');
        });

        platform.resume.subscribe(() => {
          this.log.sendEvent('App Instance Resumed', 'unknown', 'The user brought the app into the foreground');
          this.events.publish('platform:resumed');
          // this.forceUpdate(); //Resume runs first time app opens as well as resume events
        });

        //Reset this.user object when login or logout is performed by other components
        events.subscribe('user:statuschanged', () => {
          this.checkUser();
        });

        //Update active tab in menu
        events.subscribe('currenttab', (data) => {
          this.currentTab = data;
        });

        this.firebase.getToken()
          .then(token => {
            this.userInfo(token);
          }) // save the token server-side and use it to push notifications to this device
          .catch(() => {
            this.userInfo('err');
          });

        this.firebase.onTokenRefresh()
          .subscribe((token: string) => {
            this.userInfo(token);
        });


        //Check for both permissions and if location services are enabled
        if(platform.is('android'))
          this.locationPermissionAndroid();
        else if(platform.is('ios')){
          this.locationPermissionIos();
          firebase.grantPermission().then(() => {
            console.log('granted')
          });
        }
      }
      else {
        //**********************ONLY FOR IONIC LAB********************************//
        //Hardcode location and send it so we don't have to wait for geolocation
        //while developing. Coordinates are set to Palmerston office.
        // this.geolocateUser(true);
        this.location = {coords: [43.655922, - 79.410125]};
        this.sendGeolocationEvent();

        //check if user is logged in
        this.storage.get('eatiblUser').then((val) => {
          if (val)
            this.user = decode(val);
        });
      }

    });

    //Sends the users location to a child component when requested
    events.subscribe('get:geolocation', (time) => {
      this.sendGeolocationEvent();
    });

    //Sends the users location to a child component when requested
    events.subscribe('get:geolocation:autolocate', () => {
      if(this.platform.is('android')) {
        this.androidPermissions.checkPermission(this.androidPermissions.PERMISSION.ACCESS_COARSE_LOCATION).then(result => {
          if (result.hasPermission)
            this.diagnostic.isLocationEnabled().then((state) => {
              if (state) {
                if (this.location)
                  this.sendGeolocationEvent();
                else
                  this.geolocateUser(true);
              } else {
                let alert = this.alertCtrl.create({
                  title: 'Location Services Are Off',
                  subTitle: 'To auto locate you must turn your on your location services.',
                  enableBackdropDismiss: false,
                  buttons: [{
                    text: 'Dismiss',
                    handler: () => {
                      this.events.publish('enable:positionmapbuttons');
                    }
                  }]
                });
                alert.present();
              }
            });
          else {
            let alert = this.alertCtrl.create({
              title: 'Lacking Permissions',
              subTitle: 'To auto locate you must give Eatibl permission to get your location.',
              enableBackdropDismiss: false,
              buttons: [{
                text: 'Dismiss',
                handler: () => {
                  this.events.publish('enable:positionmapbuttons');
                }
              }]
            });
            alert.present();
          }
        });
      }
      else if(this.platform.is('ios'))
        this.diagnostic.getLocationAuthorizationStatus().then((status) => {
          if(status == 'authorized_when_in_use' || status == 'authorized_always') {
            if (this.location)
              this.sendGeolocationEvent();
            else
              this.geolocateUser(true);
          } else if(status == 'denied') {
            let alert = this.alertCtrl.create({
              title: 'Lacking Permissions',
              subTitle: 'To auto locate you must give Eatibl permission to get your location.',
              enableBackdropDismiss: false,
              buttons: [{
                  text: 'Dismiss',
                  handler: () => {
                    this.events.publish('enable:positionmapbuttons');
                  }
                }]
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

  //Change tab from menu
  setTab(index){
    this.menuCtrl.close();
    var tabs = ['Nearby','Search','Account','Bookings'];
    this.log.sendEvent('Tab Changed to: '+tabs[index], 'Menu', ''); //log each time modal is opened
    this.events.publish('request:changeTab', index);
  }

  //Check whether a user is logged in
  checkUser(){
    this.storage.get('eatiblUser').then((val) => {
      if (val){
        this.user = decode(val);
      }
      else{
        this.user = {
          _id: '',
          email: '',
          name: '',
          phone: '',
          type: ''
        }
      }
    });
  }

  logout(){
    let alert = this.alertCtrl.create({
      message: 'Are you sure you want to logout?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Logout',
          handler: data => {
            this.log.sendEvent('Logout', 'Menu', '');
            this.storage.remove('eatiblUser');
            this.user = {
              _id: '',
              email: '',
              name: '',
              phone: '',
              type: ''
            };
          }
        }
      ]
    });
    alert.present();
  }

  signUp(){
    this.menuCtrl.close();
    this.log.sendEvent('Signup: Initiated', 'Menu', 'User pressed signup button');
    this.navCtrl.push('SignupPage');
  }

  login(){
    this.menuCtrl.close();
    this.log.sendEvent('Login: Initiated', 'Menu', 'User pressed login button');
    this.navCtrl.push('LoginPage');
  }

  //Force the user to update if they have an unacceptable older version
  forceUpdate(){
    var self = this;
    this.appVersion.getVersionNumber().then(function(version_code){
      // self.API.makePost('versionCheck', {vers`ion: version_code}).subscribe(data => {
      var storeLink, version;
      if(self.platform.is('android')){ //Set up link and version numbers for android
        storeLink = 'market://details?id=com.eatibl';
        version = '0.1.16';
      }
      else if(self.platform.is('ios')){ //Set up link and version numbers for android
        storeLink = 'itms://itunes.apple.com/ca/app/eatibl-eat-food-save-money/id1382344870?mt=8';
        version = '0.1.20';
      }
      if(version_code == version){
        let alert = self.alertCtrl.create({
          title: 'New Version Available',
          subTitle: 'There is a required update for Eatibl. Please update and reopen the app.',
          enableBackdropDismiss: false,
          buttons: [{
            text: 'Update',
            handler: () => {
              window.open(storeLink, '_blank');
              self.forcedUpdateAlertOpen = false;
            }
          }]
        });
        if(!self.forcedUpdateAlertOpen){ //Don't open alert if it is already open
          alert.present();
          self.forcedUpdateAlertOpen = true;
        }
      }
      // });
    });
  }

  //Gather initial user information
  userInfo(token){
    var current = this; //Cache this
    this.appVersion.getVersionNumber().then(function(version_code) {
      current.API.makePost('user/device/check', {
        deviceId: current.device.uuid,
        platform: current.device.platform,
        model: current.device.model,
        version: current.device.version,
        eatiblVersion: version_code,
        firebaseToken: token
      }).subscribe(result => {
        if(result['newUser'])
          current.log.sendEvent('Device: New', 'runTime', "This is the first time we're tracking this device");
        else
          current.log.sendEvent('Device: Existing', 'runTime', "This device has accessed the app before");

        if (result['blacklisted'])
          current.blacklisted = true;
        if (!result['hideSlides'])
          current.storage.set('eatiblShowSlides', 1);
      });
    });
  }

  //Open the support modal
  supportModal(){
    this.menuCtrl.close();
    const supportModal = this.modal.create('SupportModalPage');
    this.log.sendEvent('Support Modal', 'unknown', 'Modal can be called from anywhere in the app');
    supportModal.present();
  }

  //Run geolocation permissions for iOs
  locationPermissionIos(){
    this.splashScreen.hide();
    this.diagnostic.getLocationAuthorizationStatus().then((status) => {
      if(status == 'not_determined') //Permission has not yet been asked
        this.diagnostic.requestLocationAuthorization().then((status) => {
          if(status == 'authorized_when_in_use' || status == 'authorized_always') //Permission has been authorized
          //Do we already have a custom location?
            this.storage.get('eatiblLocation').then((val) => {
              if (val)  //Custom location has been set, set userCoords to custom value
                this.events.publish('user:geolocated', val, Date.now());
              else
                this.geolocateUser(false); //If state is true, get the geolocation
            });
          else if(status == 'denied') //Permission has been denied
          //Do we already have a custom location?
            this.storage.get('eatiblLocation').then((val) => {
              if (val)  //Custom location has been set, set userCoords to custom value
                this.events.publish('user:geolocated', val, Date.now());
              else
                this.presentLocationModal(); //If location is not enabled, ask them to set a custom one
            });
        });
      else if(status == 'denied') //Permission has been denied
      //Do we already have a custom location?
        this.storage.get('eatiblLocation').then((val) => {
          if (val)  //Custom location has been set, set userCoords to custom value
            this.events.publish('user:geolocated', val, Date.now());
          else
            this.presentLocationModal(); //If location is not enabled, ask them to set a custom one
        });
      else if(status == 'authorized_when_in_use' || status == 'authorized_always') //Permission has been authorized
      //Do we already have a custom location?
        this.storage.get('eatiblLocation').then((val) => {
          if (val)  //Custom location has been set, set userCoords to custom value
            this.events.publish('user:geolocated', val, Date.now());
          else
            this.geolocateUser(false); //If state is true, get the geolocation
        });
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
                  this.geolocateUser(false); //If state is true, get the geolocation
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
    this.menuCtrl.close();
    this.log.sendEvent('Location Modal', 'Menu', ''); //log each time modal is opened
    this.events.publish('view:positionMap', true); //Get tabs page to set opacity to 0
    const mapModal = this.modal.create('SetPositionModalPage', {location: ['43.656347', '-79.380890']});
    mapModal.onDidDismiss((locationUpdated) => {
      this.events.publish('view:positionMap', false); //Get tabs page to set opacity to 1

      if(locationUpdated) //Did user update the location in the modal
        this.storage.get('eatiblLocation').then((val) => { //If so get the new location and get new ranked list of restaurants
          if(val) {  //Custom location has been set, set userCoords to custom value
            this.events.publish('user:geolocated', val, Date.now());
          }
          this.events.publish('user:newLocation'); //Tell nearby page to get restaurants with new location
        });
    });
    mapModal.present();
  }

  //Prompt terms of use / privacy policy modal
  termsModal(){
    this.menuCtrl.close();
    const termsModal = this.modal.create('TermsModalPage');

    termsModal.present();
  }

  ngOnInit(){
  }

  //Function to log geolocation every 5 minutes
  logLocation(data){
    var postObject = {
      deviceId: this.device.uuid,
      lat: data.coords.latitude,
      lng: data.coords.longitude
    };

    if(this.user._id.length) //Only add user_fid if a user object exists
      postObject['user_fid'] = this.user._id;

    if(moment().isAfter(moment(this.locationCachedTime).add(5, 'm')) || !this.locationCachedTime){ //Check if locationCachedTime is not set or is over 5 minutes old
      this.API.makePost('user/geolocation', postObject).subscribe();
      this.locationCachedTime = moment();
    }
  }

  //Get and watch the users location
  geolocateUser(autolocate){

    //Request geolocation
    this.geolocation.getCurrentPosition({timeout: 15000}).then((resp) => {
      this.logLocation(resp);
      this.location = resp;
      this.sendGeolocationEvent();

      //Set up an observable for child components/pages to watch for geolocation data
      let watch = this.geolocation.watchPosition({maximumAge: 30000});
      watch.subscribe((data) => {
        this.logLocation(data);
        this.location = data;
        this.sendGeolocationEvent();
      });
    }).catch((error) => {
      console.log(error)
      let alert = this.alertCtrl.create({
        title: "Can't Find You",
        message: "We're having trouble getting your location. Do you want to try again or set your location on a map?",
        buttons: [
          {
            text: 'Set Location',
            handler: () => {
              if(autolocate) //If we are in position modal, just dismiss and renable the buttons and get rid of loading screen
                this.events.publish('enable:positionmapbuttons');
              else
                this.presentLocationModal();
            }
          },
          {
            text: 'Try Again',
            handler: () => {
              this.geolocateUser(autolocate);
            }
          }
        ]
      });
      alert.present();
    });
  }

  //Send analytics log when menu is opened or close
  logMenu(cond){
    this.log.sendEvent('Menu '+cond, 'unknown', '');
  }

  //Push event every time the users geolocation is created or updated
  sendGeolocationEvent() {
    this.storage.get('eatiblLocation').then((val) => {
      if(this.location && !val) //Only send location back if you have it and there is no custom location
        if (this.location.coords) //Only send location if it has coordinates
          this.events.publish('user:geolocated', [this.location.coords.latitude, this.location.coords.longitude], Date.now());
    });
  }
}
