import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, Platform } from 'ionic-angular';
import { CameraPreview, CameraPreviewPictureOptions, CameraPreviewOptions, CameraPreviewDimensions } from '@ionic-native/camera-preview';
import { ActivityLoggerProvider } from "../../providers/activity-logger/activity-logger";

/**
 * Generated class for the CameraPreviewPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-camera-preview',
  templateUrl: 'camera-preview.html',
})
export class CameraPreviewPage {

  cameraPreviewOpts: CameraPreviewOptions;
  image: any;
  screenSize: any = {
    width: 0,
    height: 0
  };
  capturingPhoto = false;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private cameraPreview: CameraPreview,
    private log: ActivityLoggerProvider,
    private platform: Platform
  ) {
    this.screenSize.width = platform.width();
    this.screenSize.height = platform.height();


    // camera options (Size and location). In the following example, the preview uses the rear camera and display the preview in the back of the webview
    this.cameraPreviewOpts = {
      x: 0,
      y: 0,
      width: this.screenSize.width,
      height: this.screenSize.height,
      camera: 'rear',
      tapPhoto: true,
      previewDrag: true,
      toBack: true
    };

    this.cameraPreview.startCamera(this.cameraPreviewOpts).then(
      (res) => {
      },
      (err) => {
      });
  }

  ionViewWillEnter() {
    document.body.classList.add('_camera_preview_');
    document.getElementsByClassName("app-root")[0].classList.add('_camera_preview_')
  }

  ionViewWillLeave(){
    this.capturingPhoto = false;
    document.body.classList.remove('_camera_preview_');
    document.getElementsByClassName("app-root")[0].classList.remove('_camera_preview_')
  }

  takePhoto(){
    this.capturingPhoto = true;
    this.log.sendEvent('Capturing Bill Image', 'Camera Preview', '');
    this.cameraPreview.takePicture({height: this.screenSize.height, width: this.screenSize.width,quality: 85}).then(
      (res) => {
        this.image = 'data:image/jpeg;base64,' + res;

        this.navCtrl.push('ConfirmPricePage', {
          image: this.image,
          screenSize: this.screenSize
        });
      },
      (err) => {
        console.log('no picture :(')
        console.log(err)
      });
  }

}
