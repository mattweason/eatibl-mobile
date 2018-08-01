import { Component, ViewChild, OnInit, ChangeDetectorRef, Renderer2, ElementRef } from '@angular/core';
import { IonicPage, NavController, NavParams, Events, Content } from 'ionic-angular';
import { ApiServiceProvider } from "../../providers/api-service/api-service";
import { ActivityLoggerProvider } from "../../providers/activity-logger/activity-logger";
import { FunctionsProvider } from '../../providers/functions/functions';
import { Storage } from '@ionic/storage';
import * as moment from 'moment';
import * as _ from 'underscore';

/**
 * Generated class for the SearchPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-search',
  templateUrl: 'search.html',
})
export class SearchPage {
  @ViewChild(Content) content: Content;
  @ViewChild('searchbar') searchbar : any;

  searchInput: string;
  restaurantList: any; //just the ones loaded
  restaurantAll: any; //entire list
  restaurantFiltered: any; //filtered search results
  dataCache: any; //Cache the api return
  bookings = [];
  date: string;
  today: string;
  maxDate: string;
  showToolbar: boolean = true;
  time: any;
  userCoords: any;
  batch = 0; //Represents the batch number
  count = 0; //Stores the total number of restaurants to compare to current restaurant list
  allResults = false; //Becomes true when we've retrieved all of the restaurants
  value = ''; //Store the search key words
  firstCall = true;
  searchCategories = []; //List of clickable search categories
  searchCategoriesCache = []; //Cache of full list of search categories
  showCategories = false; //Show category list if true


  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private API: ApiServiceProvider,
    private cdRef:ChangeDetectorRef,
    public events: Events,
    private storage: Storage,
    private renderer: Renderer2,
    private functions: FunctionsProvider,
    private log: ActivityLoggerProvider
  ) {
    events.subscribe('user:geolocated', (location, time) => {
      this.userCoords = location;

      //Only request the geolocated restaurant list the first time this event is received
      if(this.firstCall){
        this.firstCall = false;
        this.API.makePost('restaurant/all/geolocated/', this.userCoords).subscribe(data => {
          this.dataCache = data;
          this.processCategories();
          this.setNow(true);
          this.cdRef.detectChanges();
        });
      }
    });

    //If there is a custom location, get it
    this.storage.get('eatiblLocation').then((location) => {
      if(location){
        this.userCoords = location;
        this.API.makePost('restaurant/all/geolocated/', this.userCoords).subscribe(data => {
          this.dataCache = data;
          this.setNow(true);
          this.cdRef.detectChanges();
        });
      }
    });
  }

  ionViewDidLoad() {
    //Call geolocation from app.component
    this.events.publish('get:geolocation', Date.now());
  }

  ionViewDidEnter(){
    this.events.publish('loaded:restaurant'); //Tell restaurant cards to rerun timeslots and businesshours processes

    //If we are not entering this page for the first time, check the location status and update restaurants as necessary
    if(!this.firstCall){
      this.storage.get('eatiblLocation').then((location) => {
        if(location && this.userCoords != location){
          this.userCoords = location;
          this.API.makePost('restaurant/all/geolocated/', this.userCoords).subscribe(data => {
            this.dataCache = data;
            this.setNow(true);
            this.cdRef.detectChanges();
          });
        }
      });
    }
  }

  //Fires when the home page tab is selected and is already active
  ionSelected() {
    this.log.sendEvent('Scroll to Top', 'Search', '');
    this.content.scrollToTop();
  }

  setNow(initialCall){
    if(this.date != this.today || initialCall){
      this.date = this.today = moment().format();
      this.time = moment().add(30 - moment().minute() % 30, 'm').format();
      this.maxDate = moment().add(30, 'day').format();
      this.rankRestaurants(this.dataCache);
    }
  }

  //Toggle category select
  toggleCategorySelect(event, condition){
    this.showCategories = condition;
    this.events.publish('hideshow:helptab', condition);
  }

  //Search for restaurants with the selected category
  searchCategory(category) {
    this.searchbar._searchbarInput.nativeElement.blur();
    this.log.sendEvent('Category List Item Clicked', 'Search', category);
    this.filterRestaurants('', category, true); //Filter the restaurants
    this.searchInput = category; //Pop the category into the search bar
    var current = this; //Cache this for setTimeout
    setTimeout(function () { //Allow the click event animation to occur
      current.hideCategoryList();
    }, 500);
  }

  //hide category list
  hideCategoryList(){
    this.showCategories = false;
  }

  filterCategories(searchInput) {
    this.searchCategories = JSON.parse(JSON.stringify(this.searchCategoriesCache)); //reset the category list. Parse and stringify to clone
    let val = searchInput;

    if (val && val.trim() !== '') {
      this.searchCategories = this.searchCategories.filter(function(item) {
        return item[0].toLowerCase().includes(val.toLowerCase());
      });
    }
  }

  //Gather and sort tags
  processCategories(){
    var rawCats = []; //Every existing category goes here to be sorted and counted
    for(var i = 0; i < this.dataCache.length; i++){
      if(this.dataCache[i].categories) //Don't loop through categories if there are none
        for(var x = 0; x < this.dataCache[i].categories.length; x++){
          rawCats.push(this.dataCache[i].categories[x])
        }
    }
    var countedCats = _.countBy(rawCats); //Count category occurrences and split the resulting objects into an arrays of key value pairs
    var sortableCats = [];
    for(var cat in countedCats){
      sortableCats.push([cat, countedCats[cat]])
    }
    this.searchCategories = _.sortBy(sortableCats, function(cat){ //Sorted the categories by occurrences descending
      return cat[1]
    }).reverse();
    this.searchCategoriesCache = JSON.parse(JSON.stringify(this.searchCategories)); //Cache the categories so we can always go back to full list. Parse and stringify to clone
  }

  //Ranking system to dictate order of display
  rankRestaurants(restaurantList){
    var day = moment(this.date).format('dddd'); //eg "Monday", "Tuesday"
    var hour = (parseInt(moment().format('k')) + (parseInt(moment().format('m')) / 60));

    for (var i = 0; i < restaurantList.length; i++){
      var rank = 100; //start with default value
      var timeslots = _.filter(restaurantList[i].timeslots, function(timeslot){
        return timeslot.day == day && timeslot.time >= hour;
      });

      //Make sure it's sorted by time ascending
      timeslots = _.sortBy(timeslots, 'time');

      //create a separate entry for the best timeslot available for the rest of today
      if(timeslots.length != 0){
        var maxDiscount = 0;
        for (var x = 0; x < timeslots.length; x++){
          if(timeslots[x].discount > maxDiscount){
            maxDiscount = timeslots[x].discount;
            restaurantList[i].maxTimeslot = timeslots[x];
          }
        }
      }
      else
        if(restaurantList[i].maxTimeslot)
          delete restaurantList[i].maxTimeslot;


      //BIG PENALTY IN RANKING FOR NO DISCOUNTS FOR TODAY
      if(timeslots.length == 0)
        rank = rank - 30;

      else //add to rank points based on discount (+1 per 10% discount at max available discount);
        rank = rank + restaurantList[i].maxTimeslot.discount / 10; //add 1pt for each 10% discount

      //if at least 5 timeslots today, add to rank
      if(timeslots.length > 4)
        rank++;

      //bonus and penalty for distance
      if(restaurantList[i].distance <= 2)
        rank = rank + 2/restaurantList[i].distance;
      else if(restaurantList[i].distance > 2 && restaurantList[i].distance <= 5)
        rank = rank - restaurantList[i].distance/2;
      else if(restaurantList[i].distance > 5)
        rank = rank - 6;

      restaurantList[i].rank = rank; //SET RANKING
    }

    //sort list by rankings
    restaurantList = _.sortBy(restaurantList, function(resto){
      return -resto.rank;
    });

    this.restaurantAll = restaurantList; //store all restos
    this.restaurantFiltered = restaurantList; //initial filtered list is the full restaurant list
    this.restaurantList = this.restaurantFiltered.slice(0,10); //load first 10
    this.batch++;
  }

  //Currently filters based on restaurant name and categories
  filterRestaurants(event, searchInput, category){
    this.searchbar._searchbarInput.nativeElement.blur(); //Blur on search (causing the keyboard to hide)
    this.log.sendEvent('Restaurant Search: Initiated', 'Search', 'User filtered restaurant based on search criteria. Search input: ' + searchInput);
    this.allResults = false;
    this.batch = 0;
    this.value = searchInput ? searchInput.toLowerCase() : ''; //Don't do toLowerCase of undefined
    var search = this.value.split(" "); //contain array of search keywords

    for (var i = 0; i < search.length; i++){
      search[i] = search[i].trim();//remove any extra spaces from each search keyword
    }

    //filter list
    this.restaurantFiltered = _.filter(this.restaurantAll, function(resto){
      for (var i = 0; i < search.length; i++) {
        if (resto.name.toLowerCase().indexOf(search[i]) > -1 && !category) //Category is true if we are doing a category search
          return true;

        //if restaurant has categories
        if(resto.categories)
          for(var x = 0; x < resto.categories.length; x++){
            if (resto.categories[x].toLowerCase().indexOf(search[i]) > -1 && !category)
              return true;
            else if(resto.categories[x].toLowerCase() == searchInput.toLowerCase() && category) //If we are doing category search, look for exact matches
              return true;
          }
      }
      //if nothing matches, you're outttaa heeerreee!
      return false;
    });

    this.log.sendEvent('Restaurant Search: Completed', 'Search', 'Results came back, with a total restaurant count of: '+this.restaurantFiltered.length);

    this.restaurantList = this.restaurantFiltered.slice(0,10); //load first 10
    this.batch++;
  }

  //Call next batch of 10 restaurants when you reach the bottom of the page
  getNextBatch(infiniteScroll){
    this.log.sendEvent('Infinite Scroll: Loaded Next Batch', 'Search', 'User scrolled down until next batch was populated, batch #: '+this.batch);
    var limit = Math.min(this.batch*10+10, this.restaurantFiltered.length);

    for(var i = this.batch*10; i < limit; i++){
      this.restaurantList.push(this.restaurantFiltered[i]);
    }

    this.batch++;

    if(this.restaurantList.length == this.restaurantFiltered.length)
      this.allResults = true;

    infiniteScroll.complete();
  }

  //Pull down to refresh the restaurant list
  doRefresh(refresher){
    this.log.sendEvent('List View: Refreshed', 'Search', 'User refreshed the restaurant list');
    this.events.publish('get:geolocation', Date.now()); //Tell the app.component we need the latest geolocation
    this.API.makePost('restaurant/all/geolocated/', this.userCoords).subscribe(data => {
      this.allResults = false;
      this.batch = 0;
      this.rankRestaurants(data);
      this.filterRestaurants('', this.searchInput, false)
      refresher.complete();
    });
  }

  //Keep track of when people are adjust date values
  logDate(action, data){
    if(action == 'changed')
      this.log.sendEvent('DatePicker: Updated', 'Search', JSON.stringify(data));
    if(action =='cancelled')
      this.log.sendEvent('DatePicker: Cancelled', 'Search', JSON.stringify(data));
  }

  //Keep track of when people are adjust time values
  logTime(action, data){
    if(action == 'changed')
      this.log.sendEvent('TimePicker: Updated', 'Search', JSON.stringify(data));
    if(action =='cancelled')
      this.log.sendEvent('TimePicker: Cancelled', 'Search', JSON.stringify(data));
  }
}
