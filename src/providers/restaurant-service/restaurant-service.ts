import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {ApiServiceProvider} from "../api-service/api-service";
import * as moment from 'moment';


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
    private API: ApiServiceProvider
  ) {

  }

  getRestos(userCoords, callback){
    if(!this.allRestos.length){
      this.API.makePost('restaurant/all/geolocated/', [userCoords[0], userCoords[1]]).subscribe(data => { //Location needs to be array format for the distance package
        this.allRestos = data;

        callback(data);
      });
    }
    else{
      var current = this;
      setTimeout(function(){
        callback(current.allRestos);
      }, 150);
    }
  }

}
