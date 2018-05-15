import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as moment from 'moment';

/*
  Generated class for the FunctionsProvider provider.

  See https://angular.io/guide/dependency-injection for more info on providers
  and Angular DI.
*/
@Injectable()
export class FunctionsProvider {

  constructor(public http: HttpClient) {
    console.log('Hello FunctionsProvider Provider');
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
    else if(hour >= 24){
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
    console.log(lat1)
    console.log(lon1)
    console.log(lat2)
    console.log(lon2)
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
}
