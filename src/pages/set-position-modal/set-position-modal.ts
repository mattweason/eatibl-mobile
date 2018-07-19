import { Component } from '@angular/core';
import {IonicPage, NavController, NavParams, ViewController} from 'ionic-angular';

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
  position: LatLng;

  constructor(
    public navCtrl: NavController,
    public viewCtrl: ViewController,
    public navParams: NavParams
  ) {
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad SetPositionModalPage');
    this.loadMap()
  }

  loadMap() {
    //Zoom and center to user location
    let mapOptions: GoogleMapOptions = {
      camera: {
        target: {
          lat: '43.659861',
          lng: '-79.390574'
        },
        zoom: 12
      },
      controls: {
        myLocation: true
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

    this.map.on('camera_target_changed').subscribe((params: any[]) => {
      this.center = params[0];
    });
  }

  setPosition(){
    this.map.clear();
    this.map.addMarker({
      icon: 'https://eatibl.com/assets/images/eatibl-pin-blue.png',
      animation: 'DROP',
      position: this.center
    });
    this.position = this.center;
  }

  //Close the modal
  dismiss(){
    this.viewCtrl.dismiss();
  }

}
