function Upload(el, file, uploader){
  this.$el = $(el);
  this.file = file;
  this.uploader = uploader;
  this.parts = [];
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
    fd.append('key',            this.file.name);
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
      context: this,
      xhr: function(){
        var xhr = $.ajaxSettings.xhr() ;
        xhr.upload.onprogress = this.progressHandler;
        return xhr ;
      },
      processData: false,
      contentType: false,
      success: function(data, textStatus, jqXHR ) {
      }
    })
  };

  this.initiateMultipartUpload = function(){
    var stringToSign = 'POST\n\n\n\nx-amz-date:'+this.date+'\n/'+this.bucket+'/'+this.file.name+'?uploads';
    var auth = this.encryptAuth(stringToSign);

    $.ajax({
      url : 'https://' + this.bucket + '.s3.amazonaws.com/'+this.file.name+'?uploads',
      type: 'post',
      dataType: 'xml',
      beforeSend: function (xhr) {
        xhr.setRequestHeader("x-amz-date", this.date);
        xhr.setRequestHeader("Authorization", auth);
      },
      context: this,
      success: function(data, textStatus, jqXHR ) {
        this.uploadId = data.getElementsByTagName("UploadId")[0].innerHTML; //this.uploadId
        this.uploadParts(this.sendPartToAmazon);
      }
    })
  };

  this.multipartAbort = function(){
    var stringToSign = 'DELETE\n\n\n\nx-amz-date:'+this.date+'\n/'+this.bucket+'/'+this.file.name+'?uploadId='+this.uploadId;
    var auth = this.encryptAuth(stringToSign);
    $.ajax({
      url : 'https://' + this.bucket + '.s3.amazonaws.com/'+this.file.name+'?uploadId='+this.uploadId,
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

  this.uploadParts = function(callback){
    for(var partNumber=1; partNumber < this.totalChunks(); partNumber++){
      var part = new UploadPart(this.file, partNumber, this);
      this.parts.push(part);
    }
    this.completeMultipart()
  };

  //TODO change multipart upload to work
  this.completeMultipart = function(){
    var stringToSign = 'POST\n\ntext/plain;charset=UTF-8\n\nx-amz-date:'+this.date+'\n/'+this.bucket+'/'+this.file.name+'?uploadId='+this.uploadId;  //Add CONTENT MD5
    var auth = this.encryptAuth(stringToSign);
    var data = this.generateXML();

    $.ajax({
      url : 'https://' + this.bucket + '.s3.amazonaws.com/'+this.file.name+'?uploadId='+this.uploadId,
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

  this.generateXML = function(){
    var XML = '<CompleteMultipartUpload>';
    this.parts.forEach(function(part){
       XML = XML +
         '  <Part>' +
         '    <PartNumber>'+part.partNumber+'</PartNumber>' +
         '    <ETag>'+part.ETag+'</ETag>' +
         '  </Part>';
      }
    );
    return XML + '</CompleteMultipartUpload>';
  };

  this.progressHandler = function(e){
    var percent = Math.round((e.loaded / e.total) * 100);

    this.$el.find('status').html(percent);
    this.$el.find('.progress-bar').width(percent+'%')
  };

  _.bindAll(this, "sendFullFileToAmazon", "initiateMultipartUpload", "multipartAbort", "encryptAuth");
  _.bindAll(this, "uploadParts", "completeMultipart", "generateXML", "progressHandler");
}
