function UploadPart(file, partNumber, upload) {
  this.file = file;
  this.partNumber = partNumber;
  this.upload = upload;
  this.startByte = this.upload.config.multipartMinSize * (partNumber - 1);
  this.endByte = this.upload.config.multipartMinSize * (partNumber);
  this.blob = this.file.slice(this.startByte, this.endByte);
  this.ETag = '';

  this.retries = 0;
}
