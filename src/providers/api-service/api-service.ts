import { Http, Response } from '@angular/http';
import { Injectable } from '@angular/core';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/do';
import 'rxjs/add/operator/catch';
import { Observable } from 'rxjs/Observable';

/*
 Generated class for the ApiServiceProvider provider.

 See https://angular.io/guide/dependency-injection for more info on providers
 and Angular DI.
 */
@Injectable()
export class ApiServiceProvider {

  private url: string = "http://localhost:3000/api/";

  constructor(private http: Http) {}

  makeCall(url){
    return this.http.get(this.url+ url)
      .map(this.extractData)
      .do(this.logResponse)
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
