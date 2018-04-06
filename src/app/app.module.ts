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
import { IonicStorageModule } from '@ionic/storage';

//Pages
import { SearchPage } from '../pages/search/search';
import { AccountPage } from '../pages/account/account';
import { BookingsPage } from '../pages/bookings/bookings';
import { HomePage } from '../pages/home/home';
import { RestaurantPage } from '../pages/restaurant/restaurant';
import { ConfirmBookingPage } from '../pages/confirm-booking/confirm-booking';
import { BookingConfirmedPage } from '../pages/booking-confirmed/booking-confirmed';
import { TabsPage } from '../pages/tabs/tabs';
import { LoginPage } from '../pages/login/login';
import { SignupPage } from '../pages/signup/signup';

//Directives
import { InputMasksDirective } from '../directives/input-masks/input-masks';
import { PressHoldDirective } from '../directives/press-hold/press-hold';

//Components
import { RestaurantComponent } from "../components/restaurant/restaurant"
import { BookingCardComponent } from "../components/booking-card/booking-card"

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
    LoginPage,
    SignupPage,
    RestaurantComponent,
    BookingCardComponent,
    InputMasksDirective,
    PressHoldDirective
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
    MyApp,
    SearchPage,
    AccountPage,
    BookingsPage,
    RestaurantPage,
    ConfirmBookingPage,
    BookingConfirmedPage,
    HomePage,
    TabsPage,
    LoginPage,
    SignupPage,
    RestaurantComponent,
    BookingCardComponent
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
