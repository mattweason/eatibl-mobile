import { Component, ViewChild, OnInit, ChangeDetectorRef, Renderer2, ElementRef } from '@angular/core';
import {IonicPage, NavController, NavParams, Events, Content, Platform} from 'ionic-angular';
import { ApiServiceProvider } from "../../providers/api-service/api-service";
import { ActivityLoggerProvider } from "../../providers/activity-logger/activity-logger";
import { FunctionsProvider } from '../../providers/functions/functions';
import { Device } from '@ionic-native/device';
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
  searchCache: string; //Cache the search input for the no results text
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
  backButtonPressed: any;


  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private API: ApiServiceProvider,
    private cdRef:ChangeDetectorRef,
    public events: Events,
    private device: Device,
    private storage: Storage,
    private renderer: Renderer2,
    private functions: FunctionsProvider,
    private log: ActivityLoggerProvider,
    private platform: Platform
  ) {
    events.subscribe('user:geolocated', (location, time) => {
      this.userCoords = location;

      //Only request the geolocated restaurant list the first time this event is received
      if(this.firstCall){
        this.firstCall = false;
        this.setNow(true);
        this.API.makePost('restaurant/all/geolocated/', this.userCoords).subscribe(data => {
          this.dataCache = data;
          this.processCategories();
          this.rankRestaurants(this.dataCache);
          this.cdRef.detectChanges();
        });
      }
    });

    //If there is a custom location, get it
    this.storage.get('eatiblLocation').then((location) => {
      if(location){
        this.userCoords = location;
        this.setNow(true);
        this.API.makePost('restaurant/all/geolocated/', this.userCoords).subscribe(data => {
          this.dataCache = data;
          this.processCategories();
          this.rankRestaurants(this.dataCache);
          this.cdRef.detectChanges();
        });
      }
    });

    //Catch backbutton click on android
    this.backButtonPressed = platform.registerBackButtonAction(() => {
      this.hideCategoryList(false);
    }, 101);
  }

  ionViewDidLoad() {
    //Call geolocation from app.component
    this.events.publish('get:geolocation', Date.now());
  }

  ionViewDidEnter(){
    this.events.publish('loaded:restaurant'); //Tell restaurant cards to rerun timeslots and businesshours processes
    if(this.searchCategories && !this.restaurantList)
      this.searchbar._searchbarInput.nativeElement.focus(); //Auto focus on the searchbar after the categories have sorted

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
    }
  }

  //Toggle category select
  toggleCategorySelect(event, condition){
    this.showCategories = condition;
    this.events.publish('hideshow:helptab', condition);
  }

  //Search for restaurants with the selected category
  searchCategory(category) {
    this.log.sendEvent('Category List Item Clicked', 'Search', category);
    this.filterRestaurants('', category, true); //Filter the restaurants
    this.searchInput = category; //Pop the category into the search bar
    var current = this; //Cache this for setTimeout
    setTimeout(function () { //Allow the click event animation to occur
      current.hideCategoryList(false);
    }, 500);
  }

  //hide category list
  hideCategoryList(checkAndroid){ //If checkAndroid is true, only hide categories if it is android
    if(checkAndroid){
      if(this.platform.is('android'))
        this.showCategories = false; //Catch back button presses on android and hide category list
    } else {
      this.showCategories = false;
    }
    this.events.publish('hideshow:helptab', false);
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
    this.searchbar._searchbarInput.nativeElement.blur(); //Blur on search (causing the keyboard to hide)
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
    sortableCats.push(['*Everything*', 999999]); //Add everything category and ensure it is always at the top of the list
    this.searchCategories = _.sortBy(sortableCats, function(cat){ //Sorted the categories by occurrences descending
      return cat[1]
    }).reverse();
    this.searchCategoriesCache = JSON.parse(JSON.stringify(this.searchCategories)); //Cache the categories so we can always go back to full list. Parse and stringify to clone
    this.searchbar._searchbarInput.nativeElement.focus(); //Auto focus on the searchbar after the categories have sorted
  }

  //Ranking system to dictate order of display
  rankRestaurants(restaurantList){
    var day = moment(this.date).format('dddd'); //eg "Monday", "Tuesday"
    var today = moment().format('dddd'); //today's day in same format as above
    var hour = (parseInt(moment().format('k')) + (parseInt(moment().format('m')) / 60));

    //filter out restaurants that have no timeslots
    restaurantList = _.filter(restaurantList, function(resto){
      return resto.timeslots.length;
    })

    for (var i = 0; i < restaurantList.length; i++){
      var rank = 100; //start with default value
      var timeslots = _.filter(restaurantList[i].timeslots, function(timeslot){

        if(today == day) //for today filter out spots that have already passed
          return timeslot.day == day && timeslot.time >= hour + 0.25; //Add a quarter hour to comparison to prevent bookings within 15 minutes of a booking time;
        else //for other days, show all available timeslots
          return timeslot.day == day;
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
    this.batch++;
  }

  //Currently filters based on restaurant name and categories
  filterRestaurants(event, searchInput, category){
    this.searchCache = this.searchInput; //Update search cache
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
    if(searchInput == '*Everything*' && category) //If someone clicks the everything category, show everything
      this.restaurantFiltered = this.restaurantAll;
    else
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

    if(this.batch*10 >= this.restaurantFiltered.length || this.restaurantFiltered.length <= 10)
      this.allResults = true; //If the first search results are less than 10, don't show buttons
    else
      this.batch++; //Only increment batch if there are more results

    this.content.scrollToTop(0);
  }

  //Call next batch of 10 restaurants
  nextBatch(){
    this.log.sendEvent('Infinite Scroll: Loaded Next Batch', 'Search', 'User pressed the next 10 results button, batch #: '+this.batch);
    var limit = Math.min(this.batch*10+10, this.restaurantFiltered.length);

    this.restaurantList = this.restaurantFiltered.slice(this.batch*10, limit); //Replace current list of restos with next 10

    //capture restaurants displayed in this batch and send to log
    this.restaurantDisplayLog(this.restaurantList, this.batch*10);

    this.batch++;
    if(this.batch*10 >= this.restaurantFiltered.length)
      this.allResults = true;
    this.content.scrollToTop(0);
  }

  //Call prev batch of 10 restaurants
  prevBatch(){
    this.batch--;
    this.allResults = false;
    this.log.sendEvent('Infinite Scroll: Loaded Previous Batch', 'Search', 'User pressed the prev 10 results button, batch #: '+this.batch);
    var limit = Math.min(this.batch*10, this.restaurantFiltered.length);

    this.restaurantList = this.restaurantFiltered.slice(this.batch*10 - 10, limit); //Replace current list of restos with prev 10

    //capture restaurants displayed in this batch and send to log
    this.restaurantDisplayLog(this.restaurantList, this.batch*10 - 10);

    this.content.scrollToTop(0);
  }

  //Pull down to refresh the restaurant list
  doRefresh(refresher){
    this.log.sendEvent('List View: Refreshed', 'Search', 'User refreshed the restaurant list');
    this.events.publish('get:geolocation', Date.now()); //Tell the app.component we need the latest geolocation
    this.API.makePost('restaurant/all/geolocated/', this.userCoords).subscribe(data => {
      this.allResults = false;
      this.batch = 0;
      this.rankRestaurants(data);
      this.filterRestaurants('', this.searchInput, false);
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

  //take a specific chunk of restaurants and log them to backend (revealing what is shown to specific users)
  restaurantDisplayLog(restoList, currentIndex){
    var formattedList = [];
    //format restoList before sending it over
    for (var i = 0; i < restoList.length; i++){

      var currentHour = this.time ? moment(this.time).format('H') : moment(this.date).format('H');
      var currentMinute = this.time ? moment(this.time).format('m') : moment(this.date).format('m');

      var selectedTime = Math.round((parseInt(currentHour) + parseInt(currentMinute)/60) * 100) / 100;

      formattedList.push({
        page: 'search',
        deviceId: this.device.uuid,
        restaurant_fid: restoList[i]._id,
        restaurantName: restoList[i].name,
        selectedDay: this.date,
        selectedTime: selectedTime,
        bestDeal: restoList[i].maxTimeslot ? restoList[i].maxTimeslot.discount : '',
        rank: currentIndex + i,
        location: this.userCoords,
        distance: Math.round(restoList[i].distance * 100) / 100
      });
    }

    this.API.makePost('log/trackDisplayActivity', {restaurants: formattedList}).subscribe(() => {});
  }
}
