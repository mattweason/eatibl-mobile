import {Directive, ElementRef, Input, Output, EventEmitter, OnInit, OnDestroy} from '@angular/core';
import {Gesture} from 'ionic-angular/gestures/gesture';

@Directive({
  selector: '[press-hold]'
})
export class PressHoldDirective implements OnInit, OnDestroy {
  el: HTMLElement;
  pressGesture: Gesture;

  constructor(el: ElementRef) {
    this.el = el.nativeElement;
  }

  //Run callback when pressed
  @Output('press-hold') pressed: EventEmitter<any> = new EventEmitter();

  ngOnInit() {
    this.pressGesture = new Gesture(this.el);
    this.pressGesture.listen();

    //Emit event when button is pressed
    this.pressGesture.on('press', e => {
      this.pressed.emit('press');
    });

    //Emit event when button press is released
    this.pressGesture.on('pressup', e => {
      this.pressed.emit('pressup');
    });
  }

  ngOnDestroy() {
    this.pressGesture.destroy();
  }
}
