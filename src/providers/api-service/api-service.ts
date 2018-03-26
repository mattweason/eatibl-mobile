import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/do';
import 'rxjs/add/operator/catch';
import { Observable } from 'rxjs/Observable';
import { ENV } from '@app/env';

/*
 Generated class for the ApiServiceProvider provider.

 See https://angular.io/guide/dependency-injection for more info on providers
 and Angular DI.
 */
@Injectable()
export class ApiServiceProvider {

  private url: string = ENV.API;

  constructor(private http: HttpClient) {}

  makeCall(url){
    return this.http.get(this.url+ url);
      //.map(this.extractData)
      //.do(this.logResponse)
      // .catch(this.catchError)
  }

  makePost(url, body){
    return this.http.post(this.url+ url, body);
    //.map(this.extractData)
    //.do(this.logResponse)
    // .catch(this.catchError)
  }

  private catchError(error: Response | any) {
    console.log(error);
    //return Observable.throw(error.json().error || 'Server error.');
  }

  private logResponse(res: Response) {
    // console.log(res);
  }

  private extractData(res: Response){
    return res.json();
  }
}
