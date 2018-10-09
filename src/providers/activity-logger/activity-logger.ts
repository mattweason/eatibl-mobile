import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ApiServiceProvider } from "../api-service/api-service";
import { Device } from '@ionic-native/device';
import { Storage } from '@ionic/storage';
import * as decode from 'jwt-decode';
import { Mixpanel } from '@ionic-native/mixpanel';

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
    private mixpanel: Mixpanel,
    private device: Device
  ) {}

  sendEvent(event, page, notes){
    this.storage.get('eatiblUser').then((val) => {
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
      }).subscribe(() => {});
      this.mixpanel.track(event, {page: page, notes: notes})
    });
  }

  sendRestoEvent(event, page, notes, restoId){
    this.storage.get('eatiblUser').then((val) => {
      if(val){
        var user = decode(val);
        this.userId = user._id;
      }
      this.API.makePost('log/trackUserActivity', {
        event: event,
        page: page,
        deviceId: this.device.uuid,
        userId: this.userId,
        notes: notes,
        restaurant_fid: restoId
      }).subscribe(() => {});
      this.mixpanel.track(event, {page: page, notes: notes, restoId: restoId})
    });
  }

  sendErrorEvent(task, page, error, notes){
    this.storage.get('eatiblUser').then((val) => {
      if(val){
        var user = decode(val);
        this.userId = user._id;
      }
      this.API.makePost('log/trackUserActivity', {
        task: task,
        page: page,
        deviceId: this.device.uuid,
        userId: this.userId,
        notes: notes,
        error: error
      }).subscribe(() => {});
      this.mixpanel.track(task, {page: page, error: error, notes: notes})
    });
  }

}
