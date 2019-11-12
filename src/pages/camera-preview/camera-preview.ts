import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { CameraPreview, CameraPreviewPictureOptions, CameraPreviewOptions, CameraPreviewDimensions } from '@ionic-native/camera-preview';


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
  deviceLevel: boolean = false;

  constructor(public navCtrl: NavController, public navParams: NavParams, private cameraPreview: CameraPreview) {

    // camera options (Size and location). In the following example, the preview uses the rear camera and display the preview in the back of the webview
    this.cameraPreviewOpts = {
      x: 0,
      y: 0,
      width: window.screen.width,
      height: window.screen.height,
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
    // document.body.classList.add('_camera_preview_');
    // document.getElementsByClassName("app-root")[0].classList.add('_camera_preview_')
  }

  ionViewWillLeave(){
    // document.body.classList.remove('_camera_preview_');
    // document.getElementsByClassName("app-root")[0].classList.remove('_camera_preview_')
  }

  takePhoto(){
    this.cameraPreview.takePicture({height: window.screen.height, width: window.screen.width,quality: 85}).then(
      (res) => {
        this.image = 'data:image/jpeg;base64,' + res;

        this.navCtrl.push('EditImagePage', {
          image: this.image
        });
      },
      (err) => {
        console.log('no picture :(')
        console.log(err)
      });
    this.cameraPreview.getSupportedPictureSizes().then(
      (res) => {
        console.log('started')
        console.log(res)
      },
      (err) => {
        console.log('failed')
        console.log(err)
      });
  }

}
