import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';

/**
 * Generated class for the ReviewModalPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-review-modal',
  templateUrl: 'review-modal.html',
})
export class ReviewModalPage {

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams)
  {
    this.review = this.navParams.get('review');
  }

  review: any;

  ionViewDidLoad() {
    console.log(this.review)
  }

}
