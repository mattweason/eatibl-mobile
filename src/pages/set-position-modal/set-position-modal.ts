import { Component } from '@angular/core';
import {IonicPage, NavController, NavParams, ViewController, ToastController, Events} from 'ionic-angular';
import { Storage } from '@ionic/storage';

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
  disableButtons = false;
  userCoords: any; //TODO: update this when you start passing through the default location from app.component

  constructor(
    public navCtrl: NavController,
    public viewCtrl: ViewController,
    public navParams: NavParams,
    private storage: Storage,
    private params: NavParams,
    private events: Events,
    private toastCtrl: ToastController
  ) {
    //Get location nav param
    this.userCoords = params.get('location');
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
    });

    this.map.on('camera_target_changed').subscribe((params: any[]) => {
      this.center = params[0];
    });
  }

  setPosition(){
    this.disableButtons = true;
    this.map.clear();
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

  //Use the devices geolocation to set location
  autoLocate(){
    this.disableButtons = true;
    var cacheLocation = this.userCoords; //Cache location in case auto locate fails
    this.storage.remove('eatiblLocation');

    //Update location when user geolocated event is recieved
    this.events.subscribe('user:geolocated', (location, time) => {
      this.events.unsubscribe('user:geolocated');
      this.userCoords = location;
      this.locationUpdated = true;

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
    });
    this.events.publish('get:geolocation:autolocate', Date.now());
  }

  //Close the modal
  dismiss(){
    this.viewCtrl.dismiss(this.locationUpdated);
  }

}
