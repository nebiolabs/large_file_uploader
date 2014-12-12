function Config(maxFileSize, bucket, accessKey, secretKey, folderName){
  this.maxFileSize      = maxFileSize;
  this.bucket           = bucket;
  this.accessKey        = accessKey;
  this.secretKey        = secretKey;
  this.multipartMinSize = 5 * 1024 * 1024;
  this.folderName       = folderName
}