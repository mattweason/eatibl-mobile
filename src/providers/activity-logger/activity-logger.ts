import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ApiServiceProvider } from "../api-service/api-service";
import { Device } from '@ionic-native/device';
import { Storage } from '@ionic/storage';
import * as decode from 'jwt-decode';

/*
  Generated class for the ActivityLoggerProvider provider.

  See https://angular.io/guide/dependency-injection for more info on providers
  and Angular DI.
*/
@Injectable()
export class ActivityLoggerProvider {
  userId = '';

  constructor(
    public http: HttpClient,
    private API: ApiServiceProvider,
    private storage: Storage,
    private device: Device
  ) {
    console.log('Hello ActivityLoggerProvider Provider');
  }

  sendEvent(event, page, notes){
    console.log('sendEvent');
    this.storage.get('eatiblUser').then((val) => {
      console.log(val);
      if(val){
        var user = decode(val);
        this.userId = user._id;
      }
      this.API.makePost('log/trackUserActivity', {
        event: event,
        page: page,
        deviceId: this.device.uuid,
        userId: this.userId,
        notes: notes
      }).subscribe();
    });
  }

}
