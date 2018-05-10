import { Component } from '@angular/core';
import { Platform } from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';
import { Geolocation } from '@ionic-native/geolocation';
import { Events } from 'ionic-angular';


@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  rootPage:any = 'TabsPage';
  location: any;


  constructor(platform: Platform, statusBar: StatusBar, splashScreen: SplashScreen, private geolocation: Geolocation, public events: Events) {
    platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      statusBar.styleDefault();
      splashScreen.hide();
    });

    //Geolocate the user when requested by child components
    events.subscribe('get:geolocation', (time) => {
      this.sendGeolocationEvent();
    });
  }

  ngOnInit(){ //TODO: wait for user to allow geolocation before loading app
    //Geolocate the user on initial load
    this.geolocation.getCurrentPosition().then((resp) => {
      this.location = resp;
      this.sendGeolocationEvent();
    }).catch((error) => {
      console.log('Error getting location', error);
    });

    //Set up an observable for child components/pages to watch for geolocation data
    let watch = this.geolocation.watchPosition();
    watch.subscribe((data) => {
      this.location = data;
      this.sendGeolocationEvent();
    });
  }

  //Push event every time the users geolocation is created or updated
  sendGeolocationEvent() {
    this.events.publish('user:geolocated', this.location, Date.now());
  }
}
