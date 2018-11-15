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
import {FunctionsProvider} from "../functions/functions";
import { LocationAccuracy } from '@ionic-native/location-accuracy';

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
    private functions: FunctionsProvider,
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
    private locationAccuracy: LocationAccuracy,
    private alertCtrl: AlertController
  ) {
    this.observableLocation = new BehaviorSubject<any>(this.location);
  }

  startTracking(forceDevice){
    console.log('start tracking');

    // Foreground Tracking

    this.storage.get('eatiblLocation').then((val) => { //Use the saved location and delete if found
      if(val && !forceDevice){
        this.location = val;
        this.locationChanged();
      }
    });

    let options = {
      maximumAge: 3000,
      enableHighAccuracy: true,
      timeout: 20000
    };

    this.watch = this.geolocation.watchPosition(options).subscribe((position: Geoposition) => {

      //PositionError handling
      if(!position.coords){
        this.log.sendErrorEvent('Geolocation Error', 'Geolocation Service', JSON.stringify(position));
        this.locationErrorAlert();
      }

      // Run update inside of Angular's zone
      if(position.coords)
        this.zone.run(() => {
          if(this.location.device){
            this.setLocation([position.coords.latitude, position.coords.longitude], 'Your Location')
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

  //Handle location mode for android
  handleLocationMode(){
    this.diagnostic.getLocationMode().then((status) => {
      if(status == this.diagnostic.locationMode.DEVICE_ONLY || status == this.diagnostic.locationMode.LOCATION_OFF){
        this.locationAccuracy.canRequest().then((canRequest: boolean) => {

          if(canRequest) {
            // the accuracy option will be ignored by iOS
            this.locationAccuracy.request(this.locationAccuracy.REQUEST_PRIORITY_HIGH_ACCURACY).then(
              () => { //User said ok!
                this.log.sendEvent('Accepted Location Mode Change', 'Geolocation Service', '');
                this.startTracking(true)
              },
              error => { //User either said no thanks or there was an error
                this.log.sendEvent('Location Mode Change Error', 'Geolocation Service', JSON.stringify(error));
                this.setLocation(this.locationDefault.coords, this.locationDefault.text)
              }
            );
          }
          else { //For whatever reason we can't request location accuracy change so just use default coords
            this.setLocation(this.locationDefault.coords, this.locationDefault.text);
            this.log.sendEvent('Location Mode Change Couldnt Ask', 'Geolocation Service', '');
          }
        });
      } else {
        this.startTracking(true)
      }
    })
  }

  //Switch back to device location for the use device location button
  useDeviceLocation(callback){
    this.diagnostic.getLocationAuthorizationStatus().then((status) => {
      if(status == this.diagnostic.permissionStatus.GRANTED || status == this.diagnostic.permissionStatus.GRANTED_WHEN_IN_USE){ //Permission has been authorized
        callback(1); //Close position modal but don't invoke loading restaurants
        if(this.locationCached.coords.length){
          this.setLocation(this.locationCached.coords, 'Your Location');

          //Android handles location service enabling different than iOS so we need to check if they are on here
          if(this.platform.is('android'))
            this.handleLocationMode();
          else
            this.startTracking(true);
        }
        else{
          this.location.device = true;

          //Android handles location service enabling different than iOS so we need to check if they are on here
          if(this.platform.is('android'))
            this.handleLocationMode();
          else
            this.startTracking(true);
        }
      }
      else if(status == this.diagnostic.permissionStatus.DENIED){ //Permission has been denied
        this.log.sendEvent('Denied Geolocation', 'Geolocation Service', 'Denied in the use device location function');
        if(this.platform.is('ios'))
          this.functions.presentAlert('Permission Denied', "You must manually enable Location Services for Eatibl by going into your iPhone's Settings.", 'Got It');
        else
          this.diagnostic.requestLocationAuthorization().then((status) => {
            if(status == this.diagnostic.permissionStatus.GRANTED || status == this.diagnostic.permissionStatus.GRANTED_WHEN_IN_USE){ //Permission has been authorized
              callback(2); //Close position modal and also invoke loading restaurants
              this.location.device = true;

              //Android handles location service enabling different than iOS so we need to check if they are on here
              if(this.platform.is('android'))
                this.handleLocationMode();
              else
                this.startTracking(true);
            }

            else
              callback(0); //Don't close set position modal
          });
      }
      else if(status == this.diagnostic.permissionStatus.DENIED_ALWAYS){
        this.log.sendEvent('Denied Geolocation Always', 'Geolocation Service', 'Denied geolocation always in the use device location function for iOS');
        this.functions.presentAlert('Permission Denied', "You must manually give permission to Eatibl to use your devices' location by going into Settings on your phone.", 'Got It');
      }
    });
  }

  //Run geolocation permissions - RUNTIME
  locationPermission(){
    this.splashScreen.hide();
    this.diagnostic.getLocationAuthorizationStatus().then((status) => {
      if(status == this.diagnostic.permissionStatus.NOT_REQUESTED) //Permission has not yet been asked
        this.diagnostic.requestLocationAuthorization().then((status) => {
          if(status == this.diagnostic.permissionStatus.GRANTED || status == this.diagnostic.permissionStatus.GRANTED_WHEN_IN_USE) { //Permission has been authorized
            this.log.sendEvent('Accepted Geolocation', 'runtime', '');

            //Android handles location service enabling different than iOS so we need to check if they are on here
            if(this.platform.is('android'))
              this.handleLocationMode();
            else
              this.startTracking(false);
          }

          else if(status == this.diagnostic.permissionStatus.DENIED){ //Permission has been denied
            this.log.sendEvent('Denied Geolocation', 'runtime', '');
            this.setLocation(this.locationDefault.coords, this.locationDefault.text);
          }
        });
      else if(status == this.diagnostic.permissionStatus.DENIED) //Permission has been denied
        this.setLocation(this.locationDefault.coords, this.locationDefault.text);
      else if(this.diagnostic.permissionStatus.GRANTED || status == this.diagnostic.permissionStatus.GRANTED_WHEN_IN_USE) { //Permission has been authorized

        //Android handles location service enabling different than iOS so we need to check if they are on here
        if (this.platform.is('android'))
          this.handleLocationMode();
        else
          this.startTracking(false);
      }
    })
  }

  //Preset custom location modal
  presentLocationModal(){
    this.menuCtrl.close();
    this.log.sendEvent('Location Modal', 'Menu', ''); //log each time modal is opened
    const mapModal = this.modal.create('SetPositionModalPage');
    mapModal.present();
  }

  //Present location error alert
  locationErrorAlert(){
    let alert = this.alertCtrl.create({
      title: 'Location Error',
      subTitle: 'We are having an issue getting your location. Do you want to try again or continue without using your location?',
      enableBackdropDismiss: false,
      buttons: [{
        text: 'Try Again',
        handler: () => {
          this.startTracking(true);
        }
      },
      {
        text: 'Continue',
        handler: () => {
          this.setLocation(this.locationDefault.coords, this.locationDefault.text);
        }
      }]
    });
    alert.present();
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

  //Save location to storage on app pause
  saveLocation(){
    if(this.location.coords.length){
      if(this.location.coords[0] != this.locationDefault.coords[0] && this.location.coords[1] != this.locationDefault.coords[1]){
        this.storage.set('eatiblLocation', this.location);
      }
    }
  }

}
