import { Component } from '@angular/core';

import { SearchPage } from '../search/search';
import { AccountPage } from '../account/account';
import { BookingsPage } from '../bookings/bookings';
import { HomePage } from '../home/home';

@Component({
  templateUrl: 'tabs.html'
})
export class TabsPage {

  tab1Root = HomePage;
  tab2Root = SearchPage;
  tab3Root = AccountPage;
  tab4Root = BookingsPage;

  constructor() {

  }
}
