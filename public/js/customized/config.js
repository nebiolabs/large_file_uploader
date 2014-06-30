function Config(maxFileSize, bucket, accessKey, secretKey, senderEmail, destEmail, folderName){
  this.maxFileSize      = maxFileSize;
  this.bucket           = bucket;
  this.accessKey        = accessKey;
  this.secretKey        = secretKey;
  this.multipartMinSize = 5 * 1024 * 1024;
  this.senderEmail      = senderEmail;
  this.destEmail        = destEmail;
  this.folderName       = folderName
}