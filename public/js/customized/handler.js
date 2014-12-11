function Handler(uploader, options){
  this.uploader = uploader;

  this.successPartUploadHandler = function(part, jqXHR, callback){
    part.ETag = jqXHR.getResponseHeader('ETag').replace(/"/g, '');
    part.upload.completedParts.push(part);

    if (part.upload.$progressBar[0]){
      var percent = Math.round((part.upload.completedParts.length / part.upload.totalChunks ) * 100)+'%';
      part.upload.$status.html(percent);
      part.upload.$progressBar.width(percent);
    }

    this.customSuccessPartHandler();
    if (part.upload.totalChunks === part.upload.completedParts.length){
      callback(part.upload)
    }
  };

  this.successUploadCompleteHandler = function(upload){
    this.uploader.completedUploads.push(upload);
    this.customSuccessHandler();
    if (this.uploader.completedUploads.length === this.uploader.uploadQueue.length){
      this.allUploadsFinishedHandler();
      this.uploader.completedUploads = [];
    }
  };

  // two types of uploads, so callback needs to be passed in
  this.initUploadFailureHandler = function(upload, callback){
    upload.retries += 1;
    if(upload.retries < 4)
    {
      setTimeout(function() {
        callback(upload);
      }, 2000);
    }
    else
    {
      upload.uploadFailed();
      console.log('Upload' + ' ' + upload.file.name + ' has failed to start uploading')
    }
  };

  this.partUploadFailure = function(part){
    var uploader = this.uploader;
    part.retries += 1;
    if(part.retries < 4)
    {
      setTimeout(function() {
        uploader.sendPartToAmazon(part);
      }, 2000);

      console.log('Upload'+' '+part.upload.file.name+' part '+part.partNumber+' has failed to start uploading and is retrying')
    }
    else
    {
      this.multiPartFailUploadHandler(part.upload);
      console.log('Upload'+' '+part.upload.file.name+' part '+part.partNumber+' has failed to start uploading 3 times');
      part.upload.uploadFailed();
      console.log('Upload' + ' ' + part.upload.file.name + ' has failed to start uploading')
    }
  };


  this.multiPartFailUploadHandler = function(upload){
    upload.retries += 1;
    if(upload.retries < 4)
    {
      setTimeout(function() {
        this.completeMultipart(upload);
      }, 2000);
    }
    else
    {
      var auth = this.encryptAuth(upload.abortStr());
      $.ajax({
        url : 'https://' + upload.config.bucket + '.s3.amazonaws.com/'+encodeURI(upload.awsObjURL)+'?uploadId='+upload.uploadId,
        type: 'DELETE',
        beforeSend: function (xhr) {
          xhr.setRequestHeader("x-amz-date", upload.date);
          xhr.setRequestHeader("Authorization", auth);
        }
      });
      upload.uploadFailed();
      console.log('Upload' + ' ' + upload.file.name + ' multipart upload did not combine')
    }
  };

  this.customSuccessPartHandler = function(){};

  this.allUploadsFinishedHandler = function(){};

  this.customSuccessHandler = function(){};

  $.extend(this, options);

  _.bindAll(this, "successPartUploadHandler", "successUploadCompleteHandler", "multiPartFailUploadHandler", "allUploadsFinishedHandler");
}