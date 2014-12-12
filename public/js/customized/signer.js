function Signer(upload){
  // exists because date has to be set right before ajax request, else there is a request time out after 15 mins
  this.upload           = upload;
  var config = upload.config;
  var bucket = config.bucket;
  var awsObjURL = upload.awsObjURL;
  var uploadId = upload.uploadId;

  this.date             = new Date().toUTCString();
  this.initSingleStr    = 'PUT\n\nmultipart/form-data\n\nx-amz-date:'+this.date+'\n/'+bucket+'/'+awsObjURL;
  this.initMultiStr     = 'POST\n\n\n\nx-amz-date:'+this.date+'\n/'+bucket+'/'+awsObjURL+'?uploads';

  this.abortStr         = function(){
    return 'DELETE\n\n\n\nx-amz-date:'+this.date+
      '\n/'+bucket+'/'+
      awsObjURL+
      '?uploadId='+uploadId;
  };

  this.finishMultiStr   = function(){
    return 'POST\n\ntext/plain;charset=UTF-8\n\nx-amz-date:'+this.date+
      '\n/'+bucket+'/'+
      awsObjURL+
      '?uploadId='+uploadId;
  };

  this.multipartInitURL = 'https://' + bucket + '.s3.amazonaws.com/'+awsObjURL+'?uploads';

  this.singlepartInitURL = 'https://' + bucket + '.s3.amazonaws.com/'+awsObjURL;

  this.partUploadURL = 'https://' + bucket + '.s3.amazonaws.com/'+awsObjURL+'?uploadId='+uploadId;

  // part stuff
  this.partStr = function(part){
    return 'PUT\n\nmultipart/form-data\n\nx-amz-date:' + this.date +
      '\n/' + bucket + '/' +
      awsObjURL +
      '?partNumber=' + part.partNumber +
      '&uploadId=' + uploadId;
  };
  this.partURL = function(part){
    return 'https://' + bucket + '.s3.amazonaws.com/' +
      awsObjURL +
      '?partNumber=' + part.partNumber
      + '&uploadId=' + uploadId;
  };

  this.encryptAuth = function(stringToSign){
    var crypto = CryptoJS.HmacSHA1(stringToSign, config.secretKey).toString(CryptoJS.enc.Base64);
    return 'AWS'+' '+config.accessKey+':'+crypto
  };

  _.bindAll(this, "abortStr", "finishMultiStr", "partStr", "partURL", "encryptAuth");

}