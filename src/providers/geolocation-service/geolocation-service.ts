import { Injectable, NgZone } from '@angular/core';
import { BackgroundGeolocation } from '@ionic-native/background-geolocation';
import { Geolocation, Geoposition } from '@ionic-native/geolocation';
import 'rxjs/add/operator/filter';
import {Events, AlertController} from "ionic-angular";

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
  }

  constructor(
    public zone: NgZone,
    public backgroundGeolocation: BackgroundGeolocation,
    public geolocation: Geolocation,
    public events: Events,
    private alertCtrl: AlertController
  ) {

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

    let options = {
      frequency: 3000,
      enableHighAccuracy: true
    };

    this.watch = this.geolocation.watchPosition(options).filter((p: any) => p.code === undefined).subscribe((position: Geoposition) => {

      console.log(position);

      this.events.publish('user:geolocated');

      // Run update inside of Angular's zone
      this.zone.run(() => {
        this.location.lat = position.coords.latitude;
        this.location.lng = position.coords.longitude;
      });

    });
  }

  showAlert(){
    let alert = this.alertCtrl.create({
      title: "Can't Find You",
      message: "We're having trouble getting your location. Do you want to try again or select your neighbourhood?",
      buttons: [
        {
          text: 'Choose Neighborhood',
          handler: () => {
            // this.presentLocationModal();
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

}
