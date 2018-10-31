import { Injectable, NgZone } from '@angular/core';
import { BackgroundGeolocation } from '@ionic-native/background-geolocation';
import { Geolocation, Geoposition } from '@ionic-native/geolocation';
import { Device } from '@ionic-native/device';
import { Diagnostic } from '@ionic-native/diagnostic';
import 'rxjs/add/operator/filter';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import * as moment from 'moment';
import { Storage } from '@ionic/storage';
import {Events, AlertController, Platform, MenuController, ModalController} from "ionic-angular";
import {ApiServiceProvider} from "../api-service/api-service";
import {AndroidPermissions} from "@ionic-native/android-permissions";
import {ActivityLoggerProvider} from "../activity-logger/activity-logger";
import {SplashScreen} from "@ionic-native/splash-screen";

/*
  Generated class for the GeolocationServiceProvider provider.

  See https://angular.io/guide/dependency-injection for more info on providers
  and Angular DI.
*/
@Injectable()
export class GeolocationServiceProvider {

  public watch: any;
  public location = {
    lat: 0,
    lng: 0
  };
  public locationCached = {
    lat: 0,
    lng: 0
  };
  public locationDefault = {
    lat: 43.655922,
    lng: -79.410125
  };
  public locationText: string;
  user = {} as any;
  locationCachedTime: any; //Used to send mark the last time geolocation data was sent to the backend
  observableLocation: any;

  constructor(
    private platform: Platform,
    public zone: NgZone,
    public backgroundGeolocation: BackgroundGeolocation,
    public geolocation: Geolocation,
    public events: Events,
    public device: Device,
    private androidPermissions: AndroidPermissions,
    private diagnostic: Diagnostic,
    private API: ApiServiceProvider,
    public menuCtrl: MenuController,
    private log: ActivityLoggerProvider,
    private modal: ModalController,
    private storage: Storage,
    public splashScreen: SplashScreen,
    private alertCtrl: AlertController
  ) {
    this.observableLocation = new BehaviorSubject<any>(this.location);
  }

  startTracking(){
// Background Tracking

    // let config = {
    //   desiredAccuracy: 0,
    //   stationaryRadius: 20,
    //   distanceFilter: 10,
    //   debug: true,
    //   interval: 2000
    // };
    //
    // this.backgroundGeolocation.configure(config).subscribe((location) => {
    //
    //   console.log('BackgroundGeolocation:  ' + location.latitude + ',' + location.longitude);
    //
    //   // Run update inside of Angular's zone
    //   this.zone.run(() => {
    //     this.lat = location.latitude;
    //     this.lng = location.longitude;
    //   });
    //
    // }, (err) => {
    //
    //   console.log(err);
    //
    // });
    //
    // // Turn ON the background-geolocation system.
    // this.backgroundGeolocation.start();


    // Foreground Tracking

    this.storage.get('eatiblLocation').then((val) => { //Use the saved location and delete if found
      if(val){
        this.location.lat = val.lat;
        this.location.lng = val.lng;
        this.locationChanged();
        this.storage.remove('eatiblLocation');
      }
    });

    let options = {
      frequency: 3000,
      enableHighAccuracy: true
    };

    this.watch = this.geolocation.watchPosition(options).filter((p: any) => p.code === undefined).subscribe((position: Geoposition) => {

      // Run update inside of Angular's zone
      this.zone.run(() => {
        this.location.lat = position.coords.latitude;
        this.location.lng = position.coords.longitude;
        this.locationText = 'You';
        this.locationChanged();
        this.locationCached.lat = position.coords.latitude;
        this.locationCached.lng = position.coords.longitude;
      });

    });
  }

  //Update the observable location
  locationChanged() {
    this.observableLocation.next(this.location);
  }

  //Manually set a location
  setLocation(coords, text){
    this.location.lat = coords.lat;
    this.location.lng = coords.lng;
    this.locationText = text;
    this.locationChanged();
  }

  //Run geolocation permissions for iOs - RUNTIME
  locationPermissionIos(){
    this.splashScreen.hide();
    this.diagnostic.getLocationAuthorizationStatus().then((status) => {
      if(status == 'not_determined') //Permission has not yet been asked
        this.diagnostic.requestLocationAuthorization().then((status) => {
          if(status == 'authorized_when_in_use' || status == 'authorized_always') //Permission has been authorized
            this.startTracking();
          else if(status == 'denied') //Permission has been denied
            this.setLocation(this.locationDefault, 'Toronto');
        });
      else if(status == 'denied') //Permission has been denied
        this.setLocation(this.locationDefault, 'Toronto');
      else if(status == 'authorized_when_in_use' || status == 'authorized_always') //Permission has been authorized
        this.startTracking();
    })
  }

  //Run geolocation permissions and availability checks for android - RUNTIME
  locationPermissionAndroid(){
    this.splashScreen.hide();
    this.androidPermissions.requestPermission(this.androidPermissions.PERMISSION.ACCESS_COARSE_LOCATION).then(
      result => {
        if(result.hasPermission){ //We have permission
          this.diagnostic.isLocationEnabled().then((state) => {
            if (state) {
              this.startTracking();
            } else {
              this.setLocation(this.locationDefault, 'Toronto');
            }
          }).catch(err => console.log(err))
        } else { //We don't have permission
          this.setLocation(this.locationDefault, 'Toronto');
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
        console.log('do something')
    });
    mapModal.present();
  }

  showAlert(){
    let alert = this.alertCtrl.create({
      title: "Can't Find You",
      message: "We're having trouble getting your location. Do you want to try again or select your neighbourhood?",
      buttons: [
        {
          text: 'Choose Neighborhood',
          handler: () => {
            this.presentLocationModal();
          }
        },
        {
          text: 'Try Again',
          handler: () => {

          }
        }
      ]
    });
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

  userLocationToggle(){
    if(this.platform.is('android')) {
      this.androidPermissions.checkPermission(this.androidPermissions.PERMISSION.ACCESS_COARSE_LOCATION).then(result => {
        if (result.hasPermission)
          this.diagnostic.isLocationEnabled().then((state) => {
            if (state) {
              this.startTracking();
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
            subTitle: 'To use your location, you must give Eatibl permission to access your location services.',
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
          // this.geolocateUser(true);
        } else if(status == 'denied') {
          let alert = this.alertCtrl.create({
            title: 'Lacking Permissions',
            subTitle: 'To use your location, you must give Eatibl permission to access your location services.',
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

  //Save location to storage on app pause
  saveLocation(){
    if(this.location.lat != 0){
      this.storage.set('eatiblLocation', this.location);
    }
  }

}
