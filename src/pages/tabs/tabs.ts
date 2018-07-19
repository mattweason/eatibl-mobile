import { Component } from '@angular/core';
import {IonicPage, Events} from 'ionic-angular';

@IonicPage()
@Component({
  selector: 'tabs-home',
  templateUrl: 'tabs.html'
})
export class TabsPage {

  tab1Root = 'HomePage';
  tab2Root = 'SearchPage';
  tab3Root = 'AccountPage';
  tab4Root = 'BookingsPage';
  hideTabs = false;

  constructor(
    public events: Events
  ) {
    events.subscribe('view:positionMap', (mapOpen) => {
      this.hideTabs = mapOpen;
    });
  }
}
