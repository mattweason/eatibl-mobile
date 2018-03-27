import { NgModule, ErrorHandler } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule }   from '@angular/forms';
import { IonicApp, IonicModule, IonicErrorHandler } from 'ionic-angular';
import { MyApp } from './app.component';
import { HttpClientModule } from '@angular/common/http';
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';

//Plugins
import { GoogleMaps } from '@ionic-native/google-maps';
import { DatePicker } from '@ionic-native/date-picker';
import { TextMaskModule } from 'angular2-text-mask';

//Pages
import { SearchPage } from '../pages/search/search';
import { AccountPage } from '../pages/account/account';
import { BookingsPage } from '../pages/bookings/bookings';
import { HomePage } from '../pages/home/home';
import { RestaurantPage } from '../pages/restaurant/restaurant';
import { ConfirmBookingPage } from '../pages/confirm-booking/confirm-booking';
import { BookingConfirmedPage } from '../pages/booking-confirmed/booking-confirmed';
import { TabsPage } from '../pages/tabs/tabs';

//Components
import { RestaurantComponent } from "../components/restaurant/restaurant"

//Services
import { ApiServiceProvider } from '../providers/api-service/api-service';
import { FunctionsProvider } from '../providers/functions/functions';

@NgModule({
  declarations: [
    MyApp,
    SearchPage,
    AccountPage,
    BookingsPage,
    RestaurantPage,
    ConfirmBookingPage,
    BookingConfirmedPage,
    HomePage,
    TabsPage,
    RestaurantComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    IonicModule.forRoot(MyApp),
    HttpClientModule,
    TextMaskModule
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    SearchPage,
    AccountPage,
    BookingsPage,
    RestaurantPage,
    ConfirmBookingPage,
    BookingConfirmedPage,
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
