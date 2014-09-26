function UploadPart(file, partNumber, upload) {
  this.file = file;
  this.partNumber = partNumber;
  this.upload = upload;
  this.startByte = this.upload.config.multipartMinSize * (partNumber - 1);
  this.endByte = this.upload.config.multipartMinSize * (partNumber);
  this.blob = this.file.slice(this.startByte, this.endByte);
  this.ETag = '';
  this.stringToSign = function(){
    return 'PUT\n\nmultipart/form-data\n\nx-amz-date:' + this.upload.date +
           '\n/' + this.upload.config.bucket + '/' +
           upload.awsObjURL +
           '?partNumber=' + this.partNumber +
           '&uploadId=' + this.upload.uploadId;
  };
  this.url = function(){
    return 'https://' + this.upload.config.bucket + '.s3.amazonaws.com/' +
           upload.awsObjURL +
           '?partNumber=' + this.partNumber
           + '&uploadId=' + this.upload.uploadId;
  };
}
