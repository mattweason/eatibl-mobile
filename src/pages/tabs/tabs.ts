import { Component, ViewChild } from '@angular/core';
import {IonicPage, Events, Tabs} from 'ionic-angular';
import { ActivityLoggerProvider } from "../../providers/activity-logger/activity-logger";

@IonicPage()
@Component({
  selector: 'tabs-home',
  templateUrl: 'tabs.html'
})
export class TabsPage {

  @ViewChild('tabs') tabRef: Tabs;

  tab1Root = 'HomePage';
  tab2Root = 'SearchPage';
  tab3Root = 'AccountPage';
  tab4Root = 'BookingsPage';
  hideTabs = false;

  constructor(
    public events: Events,
    private log: ActivityLoggerProvider
  ) {
    //Hide tabs when map is open
    events.subscribe('view:positionMap', (mapOpen) => {
      this.hideTabs = mapOpen;
    });

    events.subscribe('request:changeTab', (tab) => {
      console.log(tab)
      this.changeTab(tab);
    })
  }

  changeTab(tab){
    console.log(tab)
    this.tabRef.select(tab)
  }

  logTabChange(){
    var data = this.tabRef.getSelected();
    this.log.sendEvent('Tab Changed to: '+data.tabTitle, 'Tabs', '');
  }
}
