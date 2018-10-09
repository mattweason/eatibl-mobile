//Core Imports
import { NgModule, ErrorHandler } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule }   from '@angular/forms';
import { IonicApp, IonicModule, IonicErrorHandler, Events } from 'ionic-angular';
import { MyApp } from './app.component';
import { HttpClientModule } from '@angular/common/http';

//Native Plugins
import { GoogleMaps } from '@ionic-native/google-maps';
import { DatePicker } from '@ionic-native/date-picker';
import { Geolocation } from '@ionic-native/geolocation';
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';
import { LaunchNavigator } from '@ionic-native/launch-navigator';
import { AndroidPermissions } from '@ionic-native/android-permissions';
import { AppVersion } from '@ionic-native/app-version';
import { Firebase } from '@ionic-native/firebase';
import { Device } from '@ionic-native/device';
import { Contacts } from '@ionic-native/contacts';
import { SMS } from '@ionic-native/sms';
import { LocalNotifications } from '@ionic-native/local-notifications';
import { Diagnostic } from '@ionic-native/diagnostic';
import { LocationAccuracy } from '@ionic-native/location-accuracy';
import { Facebook } from '@ionic-native/facebook';
import { InAppBrowser } from '@ionic-native/in-app-browser';
import { Mixpanel } from '@ionic-native/mixpanel';

//Plugins
import { IonicStorageModule } from '@ionic/storage';

//Services
import { ApiServiceProvider } from '../providers/api-service/api-service';
import { FunctionsProvider } from '../providers/functions/functions';
import { AppErrorHandlerProvider } from '../providers/app-error-handler/app-error-handler';
import { ActivityLoggerProvider } from '../providers/activity-logger/activity-logger';

@NgModule({
  declarations: [
    MyApp
  ],
  imports: [
    BrowserModule,
    FormsModule,
    IonicModule.forRoot(MyApp),
    HttpClientModule,
    IonicStorageModule.forRoot()
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp
  ],
  providers: [
    StatusBar,
    DatePicker,
    SplashScreen,
    GoogleMaps,
    Geolocation,
    LaunchNavigator,
    AndroidPermissions,
    IonicErrorHandler,
    {provide: ErrorHandler, useClass: AppErrorHandlerProvider},
    ApiServiceProvider,
    FunctionsProvider,
    Events,
    AppVersion,
    Firebase,
    Facebook,
    Device,
    Contacts,
    SMS,
    InAppBrowser,
    Mixpanel,
    LocalNotifications,
    Diagnostic,
    LocationAccuracy,
    ActivityLoggerProvider
  ]
})
export class AppModule {}
