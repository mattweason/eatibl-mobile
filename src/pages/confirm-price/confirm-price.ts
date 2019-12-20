import { Component } from '@angular/core';
import {IonicPage, NavController, NavParams, AlertController} from 'ionic-angular';
import { FileTransfer, FileUploadOptions, FileTransferObject } from '@ionic-native/file-transfer';
import { File } from '@ionic-native/file';
import { Device } from '@ionic-native/device';
import { ApiServiceProvider } from "../../providers/api-service/api-service";

import * as io from 'socket.io-client';

/**
 * Generated class for the ConfirmPricePage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-confirm-price',
  templateUrl: 'confirm-price.html',
})
export class ConfirmPricePage {

  image: any;
  screenSize: any;
  deviceString: any;
  processingReceipt = true;
  priceData: any;
  processState = "Uploading Image";
  processPercent = '0%';
  tip = {
    percent: 0,
    amount: 0
  };
  totalPrice: any;
  private socket;
  socketId: any;
  cancelApi = false;

  //Bill scanning progress object
  scanProgress = {
    imageUploaded: {
      completedText: 'Uploaded Image',
      completed: false,
      percent: '20%',
      newProcessState: 'Processing Image'
    },
    imageProcessed: {
      completedText: 'Processed Image',
      completed: false,
      percent: '35%',
      newProcessState: 'Finding Bill'
    },
    billFound: {
      completedText: 'Found Bill',
      completed: false,
      percent: '65%',
      newProcessState: 'Resolving Prices'
    },
    pricesResolved: {
      completedText: 'Resolved Prices',
      completed: false,
      percent: '85%',
      newProcessState: 'Resolving Menu Items'
    },
    itemsResolved: {
      completedText: 'Resolved Menu Items',
      completed: false,
      percent: '100%',
      newProcessState: 'Done!'
    }

  }

  constructor(
      public navCtrl: NavController,
      public navParams: NavParams,
      private transfer: FileTransfer,
      private file: File,
      private device: Device,
      private alertCtrl: AlertController,
      private API: ApiServiceProvider
  ) {
    this.image = this.navParams.get('image');
    this.screenSize = this.navParams.get('screenSize');
    this.deviceString = this.device.uuid.slice(0, 3);
  }

  ionViewDidLoad() {

    //Socket io will try to connect multiple times, ensure it does not
    if(!this.socketId){

          let imgElement = document.getElementById('imageSrc');
          let imageFile = new Image();
          imageFile.src = imgElement.getAttribute('src');

          const fileTransfer: FileTransferObject = this.transfer.create();

          let options: FileUploadOptions = {
            fileKey: 'receipt',
            fileName: this.deviceString + '-' + Date.now(),
            chunkedMode: false,
            mimeType: "image/jpeg",
            headers: {}
          }

          fileTransfer.upload(imageFile.src, 'https://test.eatibl.com/api/uploadImage', options)
            .then((data) => {
              let response = JSON.parse(data.response);
              if(response['message'] == 'error') {this.errorAlert('error uploading file')}

              this.scanProgress.imageUploaded.completed = true;
              this.processState = this.scanProgress.imageUploaded.newProcessState;
              this.processPercent = this.scanProgress.imageUploaded.percent;

              const filename = response['filename'];

              //Socket io workflows
              this.socket = io('https://test.eatibl.com', { 'transports': ['websocket'] });

              this.socket.on('connect', ()=> {

                //Sometimes socket.io fires another connection. We dont mind if this happens,
                //    but we don't want to upload and process another image if this happens
                if (!this.socketId) {
                  this.socketId = this.socket.id;

                  this.API.makePost('billscan', {socketId: this.socketId, filename: filename}).subscribe(response => {
                    if(!this.cancelApi){
                      this.processState = "Done!";
                      this.processPercent = '100%';
                      setTimeout(() => {
                        this.priceData = JSON.parse(response['priceData']);
                        this.totalPrice = this.priceData.total;
                        this.processingReceipt = false;
                        this.socket.disconnect();
                      }, 1000);
                    }
                  },
                    error => {
                      this.errorAlert(error);
                    });
                }

                this.socket.on('scanProgress', (message) => {
                  if(message == 'error') {}
                  else{
                    if(this.scanProgress[message]){
                      this.scanProgress[message].completed = true;
                      this.processState = this.scanProgress[message].newProcessState;
                      this.processPercent = this.scanProgress[message].percent;
                    }
                  }
                });
              });
            }, (err) => {
              if(!this.cancelApi)
                this.errorAlert(err);
            });
    }
  }

  setTip(percent){
    if(this.tip.percent != percent){
      this.tip.percent = percent;
      this.tip.amount = this.priceData.sub * percent;
    } else {
      this.tip.percent = 0;
      this.tip.amount = 0;
    }
    this.totalPrice = this.priceData.total + this.tip.amount;
  }

  ionViewWillLeave(){
    this.cancelApi = true;
    this.socket.disconnect();
  }

  errorAlert(err) {
    this.socket.disconnect();
    let alert = this.alertCtrl.create({
      title: 'No Results',
      subTitle: 'We\'re having troubling reading your receipt, please take another photo. Error status: ' + err.http_status,
      buttons: [
        {
          text: 'Ok',
          handler: () => {
            this.navCtrl.pop();
          }
        }
        ]
    });
    alert.present();
  }
}

