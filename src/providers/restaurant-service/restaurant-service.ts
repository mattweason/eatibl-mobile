import { Injectable } from '@angular/core';
import {ApiServiceProvider} from "../api-service/api-service";
import * as moment from 'moment';
import {FunctionsProvider} from "../functions/functions";


/*
  Generated class for the RestaurantServiceProvider provider.

  See https://angular.io/guide/dependency-injection for more info on providers
  and Angular DI.
*/
@Injectable()
export class RestaurantServiceProvider {

  private allRestos = [] as any;
  private timestamp: any; //Time of last api call for restos

  constructor(
    private functions: FunctionsProvider,
    private API: ApiServiceProvider
  ) {

  }

  getRestos(userCoords, reload, callback){ //Reload is a boolean for manually getting restaurants from api
    var isTime = false; //True if last api call is over an hour ago
    if(this.timestamp){
      isTime = moment(this.timestamp).isAfter(moment(this.timestamp).add(1, 'hours'));
    }
    if(!this.allRestos.length || isTime || reload){
      this.API.makePost('restaurant/all/geolocated/', [userCoords[0], userCoords[1]]).subscribe(data => { //Location needs to be array format for the distance package
        this.allRestos = data;
        this.timestamp = moment().valueOf();
        callback(data);
      });
    }
    else{
      for(var i = 0; i < this.allRestos.length; i++){ //Update resto distances based on the new location
        this.allRestos[i].distance = this.functions.getDistanceFromLatLonInKm(userCoords[0], userCoords[1], this.allRestos[i].latitude, this.allRestos[i].longitude);
      }
      setTimeout(() => {
        callback(this.allRestos);
      }, 150);
    }
  }

}
