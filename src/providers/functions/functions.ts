import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
import { LocalNotifications } from '@ionic-native/local-notifications';
import { AlertController } from 'ionic-angular';
import * as moment from 'moment';

/*
  Generated class for the FunctionsProvider provider.

  See https://angular.io/guide/dependency-injection for more info on providers
  and Angular DI.
*/
@Injectable()
export class FunctionsProvider {

  constructor(
    public http: HttpClient,
    public storage: Storage,
    private localNotifications: LocalNotifications,
    private alertCtrl: AlertController
  ) {}

  //Add notification to notification storage object
  addNotification(id, name){
    var allNotifications = [];
    var notification = {
      id: id,
      name: name
    };

    this.storage.get('eatiblNotifications').then((val) => {
      if(val){ //Make sure to capture existing notifications and not overwrite them
        allNotifications = val['notifications'];
      }
      allNotifications.push(notification);
      this.storage.set('eatiblNotiication', {notifications: allNotifications});
    })
  }

  //Cancel specific notifications
  cancelNotification(name){
    var allNotifications = [];
    var cancelIds = [];

    this.storage.get('eatiblNotifications').then((val) => {
      if(val){ //Make sure to capture existing notifications and not overwrite them
        allNotifications = val['notifications'];

        //Capture ids of notifications that match the name, remove them from storage and cancel them
        for(var i = allNotifications.length; i > 0; i--){
          if(allNotifications[i].name == name){
            cancelIds.push(allNotifications[i].id);
            allNotifications.splice(i, 1);
          }
        }

        this.storage.set('eatiblNotiication', {notifications: allNotifications});

        this.localNotifications.cancel(cancelIds); //Cancel collected notifications
      }
    })
  }

  //Schedule the FOMO notificatiosn about making a booking
  scheduleCountdownNotifications(){
    var triggerTime24 = moment().add(2, 'days'),
        triggerTime1 = moment().add(2, 'days').add(23, 'hours'),
        countdown24 = Math.floor(10000 + Math.random() * 90000),
        countdown1 = Math.floor(10000 + Math.random() * 90000);


    this.localNotifications.schedule({
      id: countdown24, //a number from 0 to 10000
      title: "🔥 24 hours left! ⏱",
      text: "⏱ Our Early Supporter offer expires in one day. Make a booking to make sure you have a chance to win a $100 gift card!",
      trigger: {at: new Date(moment(triggerTime24).format())},
      data: {type: "Countdown24"}, //Send information to navigate to booking confirmed page
      icon: 'res://notification_app_icon',
      smallIcon: "res://my_notification_icon",
      color: "#d8354d",
    });

    this.localNotifications.schedule({
      id: countdown1, //a number from 0 to 10000
      title: "🔥 One hour left! ⏱",
      text: "⏱ Our Early Supporter offer expires in one hour. Make a booking to make sure you have a chance to win a $100 gift card!",
      trigger: {at: new Date(moment(triggerTime1).format())},
      data: {type: "Countdown1"}, //Send information to navigate to booking confirmed page
      icon: 'res://notification_app_icon',
      smallIcon: "res://my_notification_icon",
      color: "#d8354d",
    });

    this.addNotification(countdown24, 'Countdown');
    this.addNotification(countdown1, 'Countdown');
  }

  //Format a raw time to clocktime. Full is true if we want minutes
  formatClockTime(value, full){
    var clockTime;
    var hour = Math.floor(value);
    var minutes = full ? (value - hour) == 0.5 ? ':30' : ':00' : '';
    if(hour < 12)
      clockTime = hour + minutes + ' AM';
    else if(hour < 13 && hour >= 12)
      clockTime = hour + minutes + ' PM';
    else if(hour >= 13 && hour < 24){
      hour = hour - 12;
      clockTime = hour + minutes + ' PM';
    }
    else if(hour >= 24 && hour < 25){
      hour = hour - 12;
      clockTime = hour + minutes + ' AM';
    }
    else if(hour >= 25){
      hour = hour - 24;
      clockTime = hour + minutes + ' AM';
    }
    return clockTime;
  }

  //Format a regular time number into our database time format (6-30)
  formatTime(date){
    //Caching values from moment
    var hourNumber = parseInt(moment(date).format('H'));
    var minuteNumber = parseInt(moment(date).format('m'));

    var hour = hourNumber >= 6 ? hourNumber : hourNumber + 24;
    var minute = (minuteNumber / 60);

    return hour + minute;
  }

  //Calculate the distance in km between two sets of coordinates
  getDistanceFromLatLonInKm(lat1,lon1,lat2,lon2) {
    var R = 6371; // Radius of the earth in km
    var dLat = this.deg2rad(lat2-lat1);  // deg2rad below
    var dLon = this.deg2rad(lon2-lon1);
    var a =
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon/2) * Math.sin(dLon/2)
      ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    var d = R * c; // Distance in km
    return d;
  }

  //Round distances in a scaled way (ie. 100m, 1.1km, 10km)
  roundDistances(distance){
    var roundedDistance;
    if(distance >= 10)
      roundedDistance = Math.round(distance) + ' km';
    if(distance < 10 && distance >= 1)
      roundedDistance = (Math.round(distance * 10) / 10) + ' km';
    if(distance < 1)
      roundedDistance = (Math.round(distance * 100) * 10) + ' m';
    return roundedDistance;
  }

  //Convert degrees to radians
  deg2rad(deg) {
    return deg * (Math.PI/180)
  }

  //Present countdown alert
  countdownAlert(type) {
    var subTitle = null;
    if(type == 'Countdown24')
      subTitle = 'Less than 24 hours remaining';
    if(type == 'Countdown1')
      subTitle = 'Less than 1 hour remaining';
    let alert = this.alertCtrl.create({
      title: 'Early Supporter Offer',
      subTitle: subTitle,
      message: "To our early users, thank you for your support! If you try out our app and make a booking in your first 3 days you will have a chance to win a $100 gift card! The contest expires on Dec. 31, 2018.",
      buttons: ['Got It']
    });
    alert.present();
  }

  //Error alert for booking errors
  presentAlert(title, message, buttonText){
    let alert = this.alertCtrl.create({
      title: title,
      message: message,
      buttons: [buttonText]
    });
    alert.present();
  }
}
