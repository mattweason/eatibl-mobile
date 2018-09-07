import { Component } from '@angular/core';
import {IonicPage, NavController, NavParams, ViewController, ToastController, Events} from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { ActivityLoggerProvider } from "../../providers/activity-logger/activity-logger";

import {GoogleMaps, GoogleMap, GoogleMapsEvent, GoogleMapOptions, CameraPosition, MarkerOptions, Marker, LatLng} from '@ionic-native/google-maps';

/**
 * Generated class for the SetPositionModalPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-set-position-modal',
  templateUrl: 'set-position-modal.html',
})
export class SetPositionModalPage {

  map: GoogleMap;
  center: LatLng;
  position = [];
  locationUpdated = false; //If true nearby list will update and rerank
  disableButtons = true;
  userCoords: any;
  loading = false;
  cachedLocation: any;

  constructor(
    public navCtrl: NavController,
    public viewCtrl: ViewController,
    public navParams: NavParams,
    private storage: Storage,
    private params: NavParams,
    private events: Events,
    private toastCtrl: ToastController,
    private log: ActivityLoggerProvider
  ) {
    //Get location nav param
    this.userCoords = params.get('location');

    //Re-enable the set locations buttons
    events.subscribe('enable:positionmapbuttons', () => { //Specifically for auto locate returning some kind of error
      this.disableButtons = false;
      this.loading = false;
      this.storage.set('eatiblLocation',this.cachedLocation);
      this.events.subscribe('user:geolocated', this.autolocateHandler);
    });
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad SetPositionModalPage');

    //Find if a custom location has been set
    this.storage.get('eatiblLocation').then((val) => {
      if (val)
        this.userCoords = val;
      this.loadMap()
    });
  }

  loadMap() {
    //Zoom and center to user location
    let mapOptions: GoogleMapOptions = {
      camera: {
        target: {
          lat: this.userCoords[0],
          lng: this.userCoords[1]
        },
        zoom: 12
      },
      gestures: {
        tilt: false,
        rotate: false
      },
      preferences: {
        zoom: {
          minZoom: 8,
          maxZoom: 16
        }
      }
    };

    // Create a map after the view is ready and the native platform is ready.
    this.map = GoogleMaps.create('setPositionMap', mapOptions);

    this.map.addMarker({
      icon: 'https://eatibl.com/assets/images/eatibl-pin-red.png',
      position: {
        lat: this.userCoords[0],
        lng: this.userCoords[1]
      }
    }).then(() => {
      this.disableButtons = false;
    });

    this.map.on('camera_target_changed').subscribe((params: any[]) => {
      this.center = params[0];
    });
  }

  setPosition(){
    this.log.sendEvent('Set Position: Manual', 'Set Position Modal', '');
    this.disableButtons = true;
    this.map.clear();
    this.loading = false;
    this.map.addMarker({
      icon: 'https://eatibl.com/assets/images/eatibl-pin-red.png',
      animation: 'DROP',
      position: this.center
    }).then(() => {
      this.position = [this.center.lat, this.center.lng];
      this.locationUpdated = true;
      this.storage.set('eatiblLocation',this.position);
      var current = this; //Cache this

      let toast = this.toastCtrl.create({
        message: 'Location set!',
        duration: 2000,
        position: 'top',
        cssClass: 'green-background'
      });
      toast.present();

      setTimeout(function () {
        current.viewCtrl.dismiss(current.locationUpdated);
      }, 1500);
    });
  }

  //Autolocate handler
  autolocateHandler:any = (location, time) => {
    this.events.unsubscribe('user:geolocated', this.autolocateHandler);
    this.userCoords = location;
    this.locationUpdated = true;

    this.log.sendEvent('Set Position: Autolocate Completed', 'Set Position Modal', 'User got autolocated, coords: '+JSON.stringify(location));

    let toast = this.toastCtrl.create({
      message: 'Location set!',
      duration: 2000,
      position: 'top',
      cssClass: 'green-background'
    });
    toast.present();

    var current = this; //Cache this
    setTimeout(function () {
      current.viewCtrl.dismiss(current.locationUpdated);
    }, 500);
  };

  //Use the devices geolocation to set location
  autoLocate(){
    this.log.sendEvent('Set Position: Autolocate Initiated', 'Set Position Modal', 'User pressed the autolocate button');
    this.loading = true;
    this.disableButtons = true;
    this.cachedLocation = this.userCoords; //Cache location in case auto locate fails
    this.storage.remove('eatiblLocation');

    //Update location when user geolocated event is recieved
    this.events.subscribe('user:geolocated', this.autolocateHandler);
    this.events.publish('get:geolocation:autolocate', Date.now());
  }

  //Close the modal
  dismiss(){
    this.log.sendEvent('Set Position Modal: Closed', 'Set Position Modal', 'Did they update the info: '+this.locationUpdated);
    this.viewCtrl.dismiss(this.locationUpdated);
  }

}
