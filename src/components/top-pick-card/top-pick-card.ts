import {Component, Input} from '@angular/core';
import {DomSanitizer} from "@angular/platform-browser";
import { FunctionsProvider } from '../../providers/functions/functions';
import { ENV } from '@app/env';

/**
 * Generated class for the TopPickCardComponent component.
 *
 * See https://angular.io/api/core/Component for more info on Angular
 * Components.
 */
@Component({
  selector: 'top-pick-card',
  templateUrl: 'top-pick-card.html'
})
export class TopPickCardComponent {

  @Input() location = {} as any;
  @Input() restaurant = {} as any;
  @Input() date: string;
  @Input() time: string;

  private url: string = ENV.API;
  featuredImageUrl: any;

  constructor(
    private sanitizer: DomSanitizer,
    private functions: FunctionsProvider
  ) {}

  ngOnInit(){
    //If there is a featured image
    if(this.restaurant.featuredImage){
      var imageUrl = this.url+'files/'+this.restaurant.featuredImage;
      this.featuredImageUrl = this.sanitizer.bypassSecurityTrustStyle(`url(${imageUrl})`);
    }
  }

}
