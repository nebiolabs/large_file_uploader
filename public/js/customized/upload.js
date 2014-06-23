function Upload(el, file, uploader){
  this.$el = $(el);
  this.file = file;
  this.uploader = uploader;
  this.date = new Date().toUTCString();
  this.bucket = uploader.bucket; //for now set bucket
  this.multipartMinSize = uploader.multipartMinSize;
  this.totalChunks = function(){
    return Math.ceil(this.file.size / this.multipartMinSize)
  };
  this.canUseMultipart = function(){
    return this.file.size > this.multipartMinSize;
  };

  this.sendFullFileToAmazon = function(){
    var fd = new FormData();
    fd.append('key',            this.name);
    fd.append('AWSAccessKeyId', this.uploader.accessKey);
    fd.append('acl',            this.uploader.acl);
    fd.append('policy',         this.uploader.awsPolicy);
    fd.append('signature',      this.uploader.awsSignature);
    fd.append('file',           this.file);

    $.ajax({
      url : 'https://' + this.bucket + '.s3.amazonaws.com/',
      type: 'post',
      dataType: 'xml',
      data: fd,
      processData: false,
      contentType: false,
      success: function(data, textStatus, jqXHR ) {
      }
    })
  };

  this.initiateMultipartUpload = function(){
    var stringToSign = 'POST\n\n\n\nx-amz-date:'+this.date+'\n/'+this.bucket+'/'+this.name+'?uploads';
    var auth = this.encryptAuth(stringToSign);

    $.ajax({
      url : 'https://' + this.bucket + '.s3.amazonaws.com/'+this.name+'?uploads',
      type: 'post',
      dataType: 'xml',
      beforeSend: function (xhr) {
        xhr.setRequestHeader("x-amz-date", this.date);
        xhr.setRequestHeader("Authorization", auth);
      },
      context: this,
      success: function(data, textStatus, jqXHR ) {
        this.uploadId = data.getElementsByTagName("UploadId")[0].innerHTML; //this.uploadId
        this.uploadParts();
      }
    })
  };

  this.multipartAbort = function(){
    var stringToSign = 'DELETE\n\n\n\nx-amz-date:'+this.date+'\n/'+this.bucket+'/'+this.name+'?uploadId='+this.uploadId;
    var auth = this.encryptAuth(stringToSign);
    $.ajax({
      url : 'https://' + this.bucket + '.s3.amazonaws.com/'+this.name+'?uploadId='+this.uploadId,
      type: 'DELETE',
      context: this,
      beforeSend: function (xhr) {
        xhr.setRequestHeader("x-amz-date", this.date);
        xhr.setRequestHeader("Authorization", auth);
      },
      success: function(data, textStatus, jqXHR ) {
      }
    })
  };

  this.uploadParts = function(){
    for(var partNumber=1; partNumber < this.totalChunks(); partNumber++){
      var startByte = (this.multipartMinSize * (partNumber-1));
      var endByte = this.multipartMinSize * (partNumber);
      var blob = this.file.slice(startByte, endByte);  //check if missing a byte
      this.sendPartToAmazon(blob, partNumber);
    }
  };

  this.sendPartToAmazon = function(data, partNumber){
    var stringToSign = 'PUT\n\ntext/plain;charset=UTF-8\n\nx-amz-date:'+this.date+'\n/'+this.bucket+'/'+this.name+'?partNumber='+partNumber+'&uploadId='+this.uploadId;  //Add CONTENT MD5
    var auth = this.encryptAuth(stringToSign);


    $.ajax({
      url : 'https://'+this.bucket+'.s3.amazonaws.com/'+this.name+'?partNumber='+partNumber+'&uploadId='+this.uploadId,
      type: 'PUT',
      dataType: 'xml',
      data: data,
      beforeSend: function (xhr) {
        xhr.setRequestHeader("x-amz-date", this.date);
        xhr.setRequestHeader("Authorization", auth);
      },
      contentType: false,
      context: this,
      success: function(data, textStatus, jqXHR ) {
        this.partNumber = 1;
        this.ETag = jqXHR.getResponseHeader('ETag').replace(/"/g, '');
        this.completeMultipart(this.partNumber, this.ETag);
      },
      error: function(data, textStatus, jqXHR ) {
        this.multipartAbort();
      }
    })
  };

  //TODO change multipart upload to work
  this.completeMultipart = function(partNumber, ETag){
    var stringToSign = 'POST\n\ntext/plain;charset=UTF-8\n\nx-amz-date:'+this.date+'\n/'+this.bucket+'/'+this.name+'?uploadId='+this.uploadId;  //Add CONTENT MD5
    var auth = this.encryptAuth(stringToSign);

    var data =  '<CompleteMultipartUpload>' +
      '  <Part>' +
      '    <PartNumber>'+partNumber+'</PartNumber>' +
      '    <ETag>'+ETag+'</ETag>' +
      '  </Part>' +
      '</CompleteMultipartUpload>';

    $.ajax({
      url : 'https://' + bucket + '.s3.amazonaws.com/'+this.name+'?uploadId='+this.uploadId,
      type: 'POST',
      dataType: 'xml',
      data: data,
      beforeSend: function (xhr) {
        xhr.setRequestHeader("x-amz-date", this.date);
        xhr.setRequestHeader("Authorization", auth);
      },
      contentType: false,
      context: this,
      success: function(data, textStatus, jqXHR ) {
      },
      error: function(data, textStatus, jqXHR ) {
        this.multipartAbort();
      }
    })
  };

  this.encryptAuth = function(stringToSign){
    var crypto = CryptoJS.HmacSHA1(stringToSign, this.uploader.secretKey).toString(CryptoJS.enc.Base64);
    return 'AWS'+' '+this.uploader.accessKey+':'+crypto
  };

  _.bindAll(this, "sendFullFileToAmazon", "initiateMultipartUpload", "multipartAbort", "encryptAuth");
  _.bindAll(this, "uploadParts", "sendPartToAmazon", "completeMultipart");
}
