function UploadPart(file, partNumber, upload) {
  this.file = file;
  this.partNumber = partNumber;
  this.upload = upload;
  this.multipartMinSize = 5 * 1024 * 1024;
  this.startByte = (this.multipartMinSize * (partNumber - 1));
  this.endByte = this.multipartMinSize * (partNumber);
  this.blob = this.file.slice(this.startByte, this.endByte);
  this.ETag = '';
  this.stringToSign = function(){return 'PUT\n\nmultipart/form-data\n\nx-amz-date:' + this.upload.date + '\n/' + this.upload.config.bucket + '/' + encodeURI(this.file.name) + '?partNumber=' + this.partNumber + '&uploadId=' + this.upload.uploadId;};
  this.url = function(){return 'https://' + this.upload.config.bucket + '.s3.amazonaws.com/' + encodeURI(this.file.name) + '?partNumber=' + this.partNumber + '&uploadId=' + this.upload.uploadId;};
}
