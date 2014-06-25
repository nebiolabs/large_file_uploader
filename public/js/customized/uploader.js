//ConfigurationRetriever: fetches the configuration for submission
//Configuration model: abstraction to reflect the bucket, accessKey, etc
function Uploader(){

  //add check for html5
  this.handleSuccessfulSubmission = function(data){
    this.maxFileSize      = data.maxFileSize;
    this.bucket           = data.bucket;
    this.accessKey        = data.accessKey;
    this.secretKey        = data.secretKey;
    this.awsPolicy        = data.awsPolicy;
    this.awsSignature     = data.awsSignature;
    this.acl              = data.acl;
  };

  $.ajax({
    url: '/api/variables',
    dataType: 'json',
    context: this,
    success: this.handleSuccessfulSubmission
  });

  this.uploadForm = new UploaderForm('.upload-form');
  this.$uploadTable = $('.upload-table');
  this.uploadQueue = [];
  this.uploadCounter = 0;

  this.getFile = function(e){
    e.preventDefault();
    var fileList = e.target.files;

    for (var i = 0; i < fileList.length; i++) {
      var file = fileList[i];
      var fileNumber = this.uploadCounter++;

      _.templateSettings = {interpolate: /\{\{(.+?)\}\}/g};
      var template = _.template($('#template').html());
      var resultTemplate = template({fileNumber: fileNumber, file: file});

      this.$uploadTable.children('tbody').append(resultTemplate);
      var upload = new Upload($('.upload-'+fileNumber), file);
      upload.$delete.click({upload: upload}, this.removeUpload);
      this.uploadQueue.push(upload);
    }
  };

  this.startUploads = function(e){
    e.preventDefault();
    for (var i = 0; i < this.uploadQueue.length; i++) {
      var upload = this.uploadQueue[i];
      if (upload.canUseMultipart) {
        this.initiateMultipartUpload(upload);
      } else {
        this.sendFullFileToAmazon(upload);
      }
    }
  };

  this.initiateMultipartUpload = function(upload){
    var auth = this.encryptAuth(upload.initMultiStr);
    return $.ajax({
      url : 'https://' + upload.bucket + '.s3.amazonaws.com/'+upload.file.name+'?uploads',
      type: 'post',
      dataType: 'xml',
      context: this,
      beforeSend: function (xhr) {
        xhr.setRequestHeader("x-amz-date", upload.date);
        xhr.setRequestHeader("Authorization", auth);
      },
      success: function(data) {
        upload.uploadId = data.getElementsByTagName("UploadId")[0].innerHTML;
        this.uploadParts(upload);
      }
    });
  };

  this.sendFullFileToAmazon = function(upload){
    //todo: abstract to AmazonFormPayload
    var fd = new FormData();
    fd.append('key',            upload.file.name);
    fd.append('AWSAccessKeyId', this.accessKey);
    fd.append('acl',            this.acl);
    fd.append('policy',         this.awsPolicy);
    fd.append('signature',      this.awsSignature);
    fd.append('file',           upload.file);

    //todo: abstract to AmazonUpload
//    var payload = new AmazonFormPayload(amazonFile, configuration);
//    var uploader = new AmazonFormUpload()
//    uploader.upload();
    var xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", upload.progressHandler, false);
    xhr.open("POST", 'https://' + upload.bucket + '.s3.amazonaws.com/');
    xhr.send(fd);
  };

  this.multipartAbort = function(upload){
    var auth = this.encryptAuth(upload.abortStr());
    $.ajax({
      url : 'https://' + this.bucket + '.s3.amazonaws.com/'+upload.file.name+'?uploadId='+upload.uploadId,
      type: 'DELETE',
      beforeSend: function (xhr) {
        xhr.setRequestHeader("x-amz-date", upload.date);
        xhr.setRequestHeader("Authorization", auth);
      }
    })
  };

  this.uploadParts = function(upload){
    for(var partNumber=1; partNumber <= upload.totalChunks; partNumber++){
      var part = new UploadPart(upload.file, partNumber, upload);
      upload.parts.push(part);
      this.sendPartToAmazon(part);
    }
  };

  //TODO change multipart upload to work
  this.completeMultipart = function(upload){
    var auth = this.encryptAuth(upload.finishMultiStr());
    var data = upload.XML();

    $.ajax({
      url : 'https://' + upload.bucket + '.s3.amazonaws.com/'+upload.file.name+'?uploadId='+upload.uploadId,
      type: 'POST',
      dataType: 'xml',
      data: data,
      contentType: false,
      beforeSend: function (xhr) {
        xhr.setRequestHeader("x-amz-date", upload.date);
        xhr.setRequestHeader("Authorization", auth);
      },
      success: function(data, textStatus, jqXHR ) {
      }
    })
  };

  this.sendPartToAmazon = function(part){
    var auth = this.encryptAuth(part.stringToSign());

    $.ajax({
      url: part.url(),
      type: 'PUT',
      dataType: 'xml',
      data: part.blob,
      contentType:'multipart/form-data',
      processData: false,
      beforeSend: function (xhr) {
        xhr.setRequestHeader("x-amz-date", part.upload.date);
        xhr.setRequestHeader("Authorization", auth);
      },
      context: this,
      success: function(data, textStatus, jqXHR ) {
        part.ETag = jqXHR.getResponseHeader('ETag').replace(/"/g, '');
        part.upload.completedParts.push(part);
        if (part.upload.totalChunks === part.upload.completedParts.length){
          this.completeMultipart(part.upload)
        }
      }
    })
  };

  this.removeUpload = function(e){
    e.preventDefault();
    var upload = e.data.upload;
    upload.$el.remove();
    this.uploadQueue = _.without(this.uploadQueue, upload)
  };

  this.encryptAuth = function(stringToSign){
    var crypto = CryptoJS.HmacSHA1(stringToSign, this.secretKey).toString(CryptoJS.enc.Base64);
    return 'AWS'+' '+this.accessKey+':'+crypto
  };

  _.bindAll(this, "sendPartToAmazon", 'handleSuccessfulSubmission', "removeUpload");
  _.bindAll(this, "getFile", "startUploads", "initiateMultipartUpload", "sendFullFileToAmazon");
  _.bindAll(this, "encryptAuth", "multipartAbort", "uploadParts", "completeMultipart");

  this.uploadForm.$fileInput.change(this.getFile);
  this.uploadForm.$el.submit(this.startUploads)
}