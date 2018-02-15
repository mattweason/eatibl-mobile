import { NgModule, ErrorHandler } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { IonicApp, IonicModule, IonicErrorHandler } from 'ionic-angular';
import { MyApp } from './app.component';
import { HttpModule } from '@angular/http';
import { HttpClientModule } from '@angular/common/http';

//Plugins
import { GoogleMaps } from '@ionic-native/google-maps';
import { DatePicker } from '@ionic-native/date-picker';

//Pages
import { SearchPage } from '../pages/search/search';
import { AccountPage } from '../pages/account/account';
import { BookingsPage } from '../pages/bookings/bookings';
import { HomePage } from '../pages/home/home';
import { RestaurantPage } from '../pages/restaurant/restaurant';
import { TabsPage } from '../pages/tabs/tabs';

import { RestaurantComponent } from "../components/restaurant/restaurant"

import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';
import { ApiServiceProvider } from '../providers/api-service/api-service';
import { FunctionsProvider } from '../providers/functions/functions';

@NgModule({
  declarations: [
    MyApp,
    SearchPage,
    AccountPage,
    BookingsPage,
    RestaurantPage,
    HomePage,
    TabsPage,
    RestaurantComponent
  ],
  imports: [
    BrowserModule,
    IonicModule.forRoot(MyApp),
    HttpModule,
    HttpClientModule
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    SearchPage,
    AccountPage,
    BookingsPage,
    RestaurantPage,
    HomePage,
    TabsPage,
    RestaurantComponent
  ],
  providers: [
    StatusBar,
    DatePicker,
    SplashScreen,
    GoogleMaps,
    {provide: ErrorHandler, useClass: IonicErrorHandler},
    ApiServiceProvider,
    FunctionsProvider
  ]
})
export class AppModule {}
