import { Component, ViewChild } from '@angular/core';
import {IonicPage, Events, Tabs, NavController} from 'ionic-angular';
import { ActivityLoggerProvider } from "../../providers/activity-logger/activity-logger";
import {LocalNotifications} from "@ionic-native/local-notifications";

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
    public localNotifications: LocalNotifications
  ) {
    //Hide tabs when map is open
    events.subscribe('view:positionMap', (mapOpen) => {
      this.hideTabs = mapOpen;
    });

    events.subscribe('request:changeTab', (tab) => {
      console.log(tab)
      this.changeTab(tab);
    })

    //Do action if we came into app via localNotification
    // this.localNotifications.on('click').subscribe(notification => {
    //   console.log(notification)
    //   console.log('notification clicked')
    //   console.log(notification.data.type == 'Reminder')
    //   if(notification.data.type == 'Reminder') //The notification is a booking reminder
    //     this.navCtrl.push('BookingConfirmedPage', {
    //       booking: notification.data.details,
    //       restaurant: notification.data.details.restaurant_fid
    //     });
    // })
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
