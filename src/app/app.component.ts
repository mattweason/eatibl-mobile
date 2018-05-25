import { Component } from '@angular/core';
import { Platform } from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';
import { Geolocation } from '@ionic-native/geolocation';
import { AndroidPermissions } from '@ionic-native/android-permissions';
import { Events } from 'ionic-angular';


@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  rootPage:any = 'TabsPage';
  location: any;

  //Used for android permissions
  hasPermission = false;
  interval: any;
  requestedPermission = false;

  constructor(
    platform: Platform,
    statusBar: StatusBar,
    splashScreen: SplashScreen,
    private geolocation: Geolocation,
    private androidPermissions: AndroidPermissions,
    public events: Events) {

      platform.ready().then(() => {
        // Okay, so the platform is ready and our plugins are available.
        // Here you can do any higher level native things you might need.
        statusBar.styleDefault();
        splashScreen.hide();

        //Check permissions for android only. iOS and browser will return truthy always
        if (platform.is('cordova')){

          //Android does not automatically get geolocation after user grants permission
          //so every 500ms, check if we have geolocation permission
          this.interval = setInterval(this.checkPermission.bind(this), 500);
        }
        else //Only for ionic lab
          this.geolocateUser();
      });

      //Sends the users location to a child component when requested
      events.subscribe('get:geolocation', (time) => {
        console.log('geolocation request recieved')
        this.sendGeolocationEvent();
      });
  }

  ngOnInit(){
  }

  //Function to check geolocation permission on android
  checkPermission(){
    if(!this.hasPermission)
      this.androidPermissions.checkPermission(this.androidPermissions.PERMISSION.ACCESS_COARSE_LOCATION).then(
        result => {
          this.hasPermission = result.hasPermission;

          //Android requires us to manually ask permission but only do it once
          if(!this.hasPermission && !this.requestedPermission){
            this.androidPermissions.requestPermission(this.androidPermissions.PERMISSION.ACCESS_COARSE_LOCATION);
            this.requestedPermission = true;
          }
        },
        err => this.androidPermissions.requestPermission(this.androidPermissions.PERMISSION.ACCESS_COARSE_LOCATION)
      );
    else{
      this.geolocateUser();
      clearInterval(this.interval);
    }
  }

  //Get and watch the users location
  geolocateUser(){
    console.log('running?')

    //Geolocate the user
    this.geolocation.getCurrentPosition().then((resp) => {
      console.log('get current position')
      console.log(resp)
    }).catch((error) => {
      console.log('Error getting location', error);
    });

    //Set up an observable for child components/pages to watch for geolocation data
    let watch = this.geolocation.watchPosition();
    watch.subscribe((data) => {
      console.log('watch position');
      console.log(data)
      this.location = data;
      this.sendGeolocationEvent();
    });
  }

  //Push event every time the users geolocation is created or updated
  sendGeolocationEvent() {
    console.log('attempting to publish location')
    console.log(this.location)
    if(this.location) //Only send location back if you have it
      if(this.location.coords) { //Only send location if it has coordinates
        console.log('publishing location')
        console.log(this.location)
        this.events.publish('user:geolocated', this.location, Date.now());
      }
  }
}
