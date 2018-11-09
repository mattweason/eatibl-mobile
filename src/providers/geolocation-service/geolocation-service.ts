import { Injectable, NgZone } from '@angular/core';
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
    text: '',
    coords: [],
    timestamp: 0,
    device: true
  };
  public locationCached = {
    text: '',
    coords: [],
    timestamp: 0,
    device: true
  };
  public locationDefault = {
    text: 'Yonge & Dundas',
    coords: [43.6564127, -79.3825728],
    timestamp: Date.now(),
    device: false
  };
  user = {} as any;
  locationCachedTime: any; //Used to send mark the last time geolocation data was sent to the backend
  observableLocation: any;
  manualReload = true;

  constructor(
    private platform: Platform,
    public zone: NgZone,
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
        this.location = val;
        this.locationChanged();
      }
    });

    let options = {
      frequency: 3000,
      enableHighAccuracy: true
    };

    this.watch = this.geolocation.watchPosition(options).filter((p: any) => p.code === undefined).subscribe((position: Geoposition) => {

      // Run update inside of Angular's zone
      this.zone.run(() => {
        if(this.location.device){
          this.location.coords = [position.coords.latitude, position.coords.longitude];
          this.location.text = 'Your Location';
          this.location.timestamp = Date.now();
          this.locationChanged();
        }
        this.locationCached.coords = [position.coords.latitude, position.coords.longitude];
      });

    });
  }

  //Update the observable location
  locationChanged() {
    this.observableLocation.next(this.location);
  }

  //Toggle manual reload
  toggleManualReload(cond){
    this.manualReload = cond;
  }

  //Manually set a location
  setLocation(coords, text){
    this.location.coords = [coords[0], coords[1]];
    this.location.text = text;
    this.location.device = text == 'Your Location' ? true : false;
    this.locationChanged();
  }

  //Switch back to device location for the use device location button
  useDeviceLocation(callback){
    this.diagnostic.getLocationAuthorizationStatus().then((status) => {
      if(status == this.diagnostic.permissionStatus.GRANTED || status == this.diagnostic.permissionStatus.GRANTED_WHEN_IN_USE){ //Permission has been authorized
        callback(true);
        this.setLocation(this.locationCached.coords, 'Your Location');
      }
      else if(status == this.diagnostic.permissionStatus.DENIED) //Permission has been denied
        this.diagnostic.requestLocationAuthorization().then((status) => {
          if(status == this.diagnostic.permissionStatus.GRANTED || status == this.diagnostic.permissionStatus.GRANTED_WHEN_IN_USE){ //Permission has been authorized
            callback(true);
            this.location.device = true;
            this.startTracking();
          } else
            callback(false);
        });
    });
  }

  //Run geolocation permissions - RUNTIME
  locationPermission(){
    this.splashScreen.hide();
    this.diagnostic.getLocationAuthorizationStatus().then((status) => {
      if(status == this.diagnostic.permissionStatus.NOT_REQUESTED) //Permission has not yet been asked
        this.diagnostic.requestLocationAuthorization().then((status) => {
          if(status == this.diagnostic.permissionStatus.GRANTED || status == this.diagnostic.permissionStatus.GRANTED_WHEN_IN_USE) //Permission has been authorized
            this.startTracking();
          else if(status == this.diagnostic.permissionStatus.DENIED) //Permission has been denied
            this.setLocation(this.locationDefault.coords, this.locationDefault.text);
        });
      else if(status == this.diagnostic.permissionStatus.DENIED) //Permission has been denied
        this.setLocation(this.locationDefault.coords, this.locationDefault.text);
      else if(this.diagnostic.permissionStatus.GRANTED || status == this.diagnostic.permissionStatus.GRANTED_WHEN_IN_USE) //Permission has been authorized
        this.startTracking();
    })
  }

  //Preset custom location modal
  presentLocationModal(){
    this.menuCtrl.close();
    this.log.sendEvent('Location Modal', 'Menu', ''); //log each time modal is opened
    const mapModal = this.modal.create('SetPositionModalPage');
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
    if(this.location.coords.length){
      if(this.location.coords[0] != this.locationDefault.coords[0] && this.location.coords[1] != this.locationDefault.coords[1]){
        this.storage.set('eatiblLocation', this.location);
      }
    }
  }

}
