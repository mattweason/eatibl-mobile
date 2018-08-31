import { Component, ViewChild } from '@angular/core';
import {IonicPage, Events, Tabs, NavController, Platform} from 'ionic-angular';
import { ActivityLoggerProvider } from "../../providers/activity-logger/activity-logger";
import {LocalNotifications} from "@ionic-native/local-notifications";
import { Storage } from '@ionic/storage';

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
    private log: ActivityLoggerProvider,
    public navCtrl: NavController,
    private storage: Storage,
    private platform: Platform,
    public localNotifications: LocalNotifications
  ) {
    //Hide tabs when map is open
    events.subscribe('view:positionMap', (mapOpen) => {
      this.hideTabs = mapOpen;
    });

    //Programmatically change tab via request from something other than a tab button
    events.subscribe('request:changeTab', (tab) => {
      this.changeTab(tab);
    })

    //Capture if we need to do something for a reminder
    this.checkReminder(); //For first load
    events.subscribe('platform:resumed', () => {
      this.checkReminder(); //For when app is in background
    })
  }

  checkReminder(){
    //Find out if we have a reminder lined up
    this.storage.get('eatiblReminder').then((val) => {
      if(val) { //If custom location, show card about custom location
        this.navCtrl.push('BookingConfirmedPage', {
          booking: val['details'],
          restaurant: val['details']['restaurant_fid'] //Contains all restaurant information
        });
        this.storage.remove('eatiblReminder');
      }
    });
  }

  tabPressed(tab){
    this.log.sendEvent('Tab Changed to: '+tab, 'Tabs', '');
  }

  changeTab(tab){
    this.tabRef.select(tab);
    this.logTabChange();
  }

  logTabChange(){
    var data = this.tabRef.getSelected();
    this.events.publish('currenttab', data.tabTitle);
  }
}
