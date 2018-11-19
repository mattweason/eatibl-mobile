import {Component, Input, ViewChild} from '@angular/core';
import {IonicPage, NavController, NavParams, Select} from 'ionic-angular';
import {FunctionsProvider} from "../../providers/functions/functions";

/**
 * Generated class for the AllDealsPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-all-deals',
  templateUrl: 'all-deals.html',
})
export class AllDealsPage {
  @ViewChild('peopleSelect') peopleSelect: Select;

  private allTimeslots = {} as any;
  people: Number = 2;
  rowIndex: Number = 0;

  constructor(
    public navCtrl: NavController,
    private functions: FunctionsProvider,
    public navParams: NavParams
  ) {
    this.allTimeslots = JSON.parse(this.navParams.get('allTimeslots'));
  }

  //Open people select programatically
  openPeopleSelect(){
    if(this.peopleSelect){
      this.peopleSelect.open()
    }
  }

  //Toggle day expansions
  expandWeekday(index){
    if(this.rowIndex == index)
      this.rowIndex = 8;
    else
      this.rowIndex = index;
  }

  //Activate a booking
  selectBooking(timeslot){
    this.log.sendEvent('Timeslot: Selected', 'Restaurant', 'User chose timeslot: '+ JSON.stringify(timeslot));
    this.activeTimeslot = timeslot;
  }

}
