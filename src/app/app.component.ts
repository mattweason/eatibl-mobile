import {Component, ViewChild, enableProdMode} from '@angular/core';
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
import { Mixpanel } from '@ionic-native/mixpanel';
import { FunctionsProvider } from '../providers/functions/functions';
import { GeolocationServiceProvider } from '../providers/geolocation-service/geolocation-service';
enableProdMode();

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
    private functions: FunctionsProvider,
    private geolocationService: GeolocationServiceProvider,
    private firebase: Firebase,
    private diagnostic: Diagnostic,
    private log: ActivityLoggerProvider,
    private locationAccuracy: LocationAccuracy,
    public localNotifications: LocalNotifications,
    public menuCtrl: MenuController,
    private mixpanel: Mixpanel
  ) {

    platform.ready().then(() => {
      console.log('platform ready - '+ moment().format('X'))
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

        //Init mixpanel
        this.mixpanel.init('7b6185b1254ff128594ee76928b5847e')
          .then((res) => {
            this.log.sendEvent('Mixpanel Initialized', 'runTime', JSON.stringify(res));
          })
          .catch((err) => {
            this.log.sendErrorEvent('Mixpanel Initialization Failed', 'runtime', JSON.stringify(err), '');
          });

          this.storage.get('eatiblUser').then((val) => {
            if(val) {
              var post = decode(val);
              if (!post['created_at'])
                this.API.makePost('updateJWT', {email: post.email}).subscribe((response) => {
                  this.storage.set('eatiblUser', response['token']);
                });
            }
          });

        // //Do action if we came into app via localNotification
        this.localNotifications.on('click').subscribe(notification => {
          this.log.sendEvent('Entered App by Local Notification', 'runTime', JSON.stringify(notification));

          if(notification.data.type == 'incomplete booking' )//Booking initiated notifications
            this.navigateTo('', notification.data);
          else if (notification.data.type == 'Reminder') //Reminder notifications
            this.navCtrl.push('BookingConfirmedPage', {
              booking: notification.data.booking,
              restaurant: notification.data.restaurant,
              inviteModal: true
            });
          else if (notification.data.type.indexOf('Countdown') > -1 ){ //Countdown notifications
              this.functions.countdownAlert(notification.data.type);
          }
        });

        //Send a log for each local notification that is triggered
        this.localNotifications.on('trigger').subscribe(notification => {
          this.log.sendEvent('Local Notification Triggered', 'unknown', JSON.stringify(notification));
        });

        // //Check if we already have a re-engage notification and cancel it if we do
        if(this.localNotifications.isPresent(1)){
          this.localNotifications.cancel(1)
        }
        // Schedule a new notification for first-timers and regular users
        this.localNotifications.schedule({
          id: 1,
          trigger: {at: (moment().add(15, 'seconds')).toDate()},
          text:  "🍔 We're getting new deals everyday, come check out our latest offerings!",
          title: "We've missed you! 🙂",
          icon: 'res://notification_app_icon',
          smallIcon: "res://my_notification_icon",
          color: "#d8354d"
        });

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
          console.log('app paused')
          this.log.sendEvent('App Instance Paused', 'unknown', 'The user put the app into the background');
          this.geolocationService.saveLocation();
        });

        platform.resume.subscribe(() => {
          this.log.sendEvent('App Instance Resumed', 'unknown', 'The user brought the app into the foreground');
          this.events.publish('platform:resumed');
          // this.forceUpdate(); //Resume runs first time app opens as well as resume events

          //Make sure to reset the re engagement notification whenever the app is put in the foreground
          if(this.localNotifications.isPresent(1)){
            this.localNotifications.cancel(1)
          }
          // Schedule a new notification for first-timers and regular users
          this.localNotifications.schedule({
            id: 1,
            trigger: {at: (moment().add(7, 'days').hours(11).minutes(30)).toDate()},
            text:  "🍔 We're getting new deals everyday, come check out our latest offerings!",
            title: "We've missed you! 🙂",
            icon: 'res://notification_app_icon',
            smallIcon: "res://my_notification_icon",
            color: "#d8354d"
          });
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
            var current = this;
            setTimeout(function(){
              current.userInfo(token);
            }, 1000);
        });

        //Check for both permissions and if location services are enabled
        this.geolocationService.locationPermission();

        //Request permission for push notifications
        if(platform.is('ios')){
          firebase.grantPermission().then(() => {
            console.log('granted')
          });
        }
      }
      else {
        //**********************ONLY FOR IONIC LAB********************************//
        //Hardcode location and send it so we don't have to wait for geolocation
        //while developing. Coordinates are set to Palmerston office.
        this.geolocationService.setLocation([43.6564126, -79.3825729], 'Yonge & Dundas');

        //check if user is logged in
        this.storage.get('eatiblUser').then((val) => {
          if (val)
            this.user = decode(val);
        });

        //Set AB test value for Ionic Lab
        this.storage.set('eatiblABValue', 40);
      }

    });
  }

  navigateTo(timeslotId, postObject){
    this.navCtrl.push('RestaurantPage', {
      restaurant: JSON.stringify(postObject.restaurant),
      timeslotsData: JSON.stringify(postObject.timeslots),
      businessHoursData: JSON.stringify(postObject.businessHours),
      timeslotId: timeslotId,
      date: postObject.date,
      time: postObject.time
    }).then(() => {});
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

        //Save ab test value to local storage
        current.storage.set('eatiblABValue', result['test']);

        if (result['blacklisted'])
          current.blacklisted = true;
        if (!result['hideSlides'])
          current.storage.set('eatiblShowSlides', 1);
      });
    });
  }

  //Preset custom location modal
  presentLocationModal(){
    this.menuCtrl.close();
    this.geolocationService.presentLocationModal();
  }

  //Open intro slides
  presentHIWModal(){
    this.log.sendEvent('How It Works opened', 'Home', '');
    const HIWModal = this.modal.create('HowItWorksModalPage', {newUser: true});
    HIWModal.present();
  }

  //Open the support modal
  supportModal(){
    this.menuCtrl.close();
    const supportModal = this.modal.create('SupportModalPage');
    this.log.sendEvent('Support Modal', 'unknown', 'Modal can be called from anywhere in the app');
    supportModal.present();
  }

  //Prompt terms of use / privacy policy modal
  termsModal(){
    this.menuCtrl.close();
    const termsModal = this.modal.create('TermsModalPage');

    termsModal.present();
  }

  //Send analytics log when menu is opened or close
  logMenu(cond){
    this.log.sendEvent('Menu '+cond, 'unknown', '');
  }
}
