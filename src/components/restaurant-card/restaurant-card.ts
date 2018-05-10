import { Component, Input, OnInit, OnChanges, SimpleChange, ViewChild, ChangeDetectorRef } from '@angular/core';
import { DomSanitizer, SafeResourceUrl, SafeUrl } from '@angular/platform-browser';
import { NavController, Slides } from 'ionic-angular';
import { ApiServiceProvider } from "../../providers/api-service/api-service";
import * as _ from 'underscore';
import * as moment from 'moment';
import { FunctionsProvider } from '../../providers/functions/functions';
import { ENV } from '@app/env';


/**
 * Generated class for the RestaurantComponent component.
 *
 * See https://angular.io/api/core/Component for more info on Angular
 * Components.
 */
@Component({
  selector: 'restaurant-card',
  templateUrl: 'restaurant-card.html'
})
export class RestaurantCardComponent implements OnChanges {
  private isVisible = false;
  private slides: Slides;
  private url: string = ENV.API;

  //Need slides to load before setting this.slides so we can set the current slide based on the active timeslot
  @ViewChild('slides') set content(content: Slides) {
    this.slides = content;
    this.setInitialPosition();
    setTimeout(() => {
      this.isLoaded = true;
      setTimeout(() => {
        this.isVisible = true;
      }, 0);
    }, 0);
    this.cdRef.detectChanges();
  }

  @Input() location = {} as any;
  @Input() restaurant = {} as any;
  @Input() date: string;
  @Input() time: string;

  ngOnChanges(changes: {[propKey: string]: SimpleChange}) {
    if(changes.hasOwnProperty('location'))
      this.setDistance();
    if(changes.hasOwnProperty('restaurant') || changes.hasOwnProperty('date') || changes.hasOwnProperty('time')){
      this.processBusinessHours();
      this.processTimeslots();
      this.setSlide();
    }
  }

  timeslots: any;
  timeslotsData = {} as any;
  businessHours = [];
  businessHoursData = {} as any;
  openStatus: any;
  isLoaded: boolean = false;
  isInitial: boolean = true;
  scrollingSlides: any;
  isBeginning: boolean = false;
  isEnd: boolean = false;
  featuredImageUrl: any;
  restaurantTapped = false;
  timeslotTapped = '';
  distance: any;

  constructor(
    public navCtrl: NavController,
    private API: ApiServiceProvider,
    private functions: FunctionsProvider,
    private cdRef:ChangeDetectorRef,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(){
    //Get discount timeslots
    this.API.makeCall('discount/' + this.restaurant._id + '/week').subscribe(data => {
      this.timeslotsData = data;
      this.processTimeslots()
    });
    //Get business hours
    this.API.makeCall('hours/' + this.restaurant._id).subscribe(data => {
      this.businessHoursData = data;
      this.processBusinessHours()
    });
    //If there is a featured image
    if(this.restaurant.featuredImage){
      console.log('url('+this.url+'files/'+this.restaurant.featuredImage+')');
      var imageUrl = this.url+'files/'+this.restaurant.featuredImage;
      this.featuredImageUrl = this.sanitizer.bypassSecurityTrustStyle(`url(${imageUrl})`)
    }
  }

  navigateTo(event, timeslotId){
    if(timeslotId == '')
      this.restaurantTapped = true;
    else
      this.timeslotTapped = timeslotId;
    this.navCtrl.push('RestaurantPage', {
      restaurant: JSON.stringify(this.restaurant),
      timeslotsData: JSON.stringify(this.timeslotsData),
      businessHoursData: JSON.stringify(this.businessHoursData),
      timeslotId: timeslotId,
      date: this.date
    }).then(() => {
      this.restaurantTapped = false;
      this.timeslotTapped = '';
    });
  }

  //To establish open now or closed in view
  isOpen(){
    //Get current time to compare to open close hours for day
    var time = this.functions.formatTime(this.date);

    //Compare current time to open close hours and set to this.open
    if(time < this.businessHours[0])
      this.openStatus = 'soon';
    if(time >= this.businessHours[0] && time < this.businessHours[1])
      this.openStatus = 'open';
    if(time >= this.businessHours[1])
      this.openStatus = 'closed';
  }

  //Filter timeslots for the currently selected date
  processTimeslots(){
    var hour = (parseInt(moment().format('k')) + (parseInt(moment().format('m')) / 60));
    var date = this.date;

    //Filter timeslots by date and time
    this.timeslots = _.filter(this.timeslotsData, function(timeslot){
      if(moment(date).isSame(moment(), 'day'))
        return (timeslot.day == moment(date).format('dddd').toString() && timeslot.time > hour);
      else
        return (timeslot.day == moment(date).format('dddd').toString());
    });

    this.timeslots = _.sortBy(this.timeslots, 'time');
  }

  //Add open and close hours to businessHours array for ngFor loop in view
  processBusinessHours(){
    for (var i = 0; i < this.businessHoursData.length; i++)
      if(this.businessHoursData[i]['day'] == moment(this.date).format('dddd').toString()){
        this.businessHours[0] = this.businessHoursData[i]['open'];
        this.businessHours[1] = this.businessHoursData[i]['close'];
      }
    this.isOpen();
  }

  //When time changes or date changes, set slide to selected time
  setSlide(){
    if(this.slides){
      var time = this.time;
      var index = _.findIndex(this.timeslots, function(timeslot){
        return timeslot.time == (moment(time).get('hour') + (moment(time).get('minute') / 60))
      });
      this.slides.slideTo(index - 1)
    }
  }

  nextSlide(){
    if(this.slides)
      if(!this.slides.isEnd())
        this.slides.slideNext();
  }

  prevSlide(){
    if(this.slides)
      if(!this.slides.isBeginning())
        this.slides.slidePrev();
  }

  //Run and receives response from press-hold directive
  scrollSlides(response, direction){
    if(response == 'press'){
      this.scrollingSlides = setInterval(() => {
        if(direction == 'prev')
          this.prevSlide();
        if(direction == 'next')
          this.nextSlide();
      }, 100)
    }
    if(response == 'pressup'){
      clearInterval(this.scrollingSlides);
    }
  }

  //Det whether the slide is at the end or the beginning on initial load
  setInitialPosition(){
    if(this.slides)
      setTimeout(() => {
        this.isBeginning = this.slides.isBeginning();
        this.isEnd = this.slides.isEnd();
      }, 500);
  }

  //Set whether the slide is at the end or beginning
  slidePosition(){
    if(this.slides){
      this.isBeginning = this.slides.isBeginning();
      this.isEnd = this.slides.isEnd();
    }
  }

  //Determine and set distance in km from restaurant to user location
  setDistance(){
    //Get distance only if coordinates are available
    if(this.location && this.restaurant.latitude && this.restaurant.longitude){
      var distance = this.functions.getDistanceFromLatLonInKm(this.location['coords']['latitude'], this.location['coords']['longitude'], this.restaurant.latitude, this.restaurant.longitude);
      console.log(distance)
      this.distance = this.functions.roundDistances(distance);
      console.log(this.distance)
    }
  }
}
