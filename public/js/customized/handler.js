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
    upload.startUploads += 1;
    if(upload.startRetries < 4)
    {
      callback(upload);
    }
    else
    {
      upload.uploadFailed();
      console.log('Upload' + ' ' + upload.file.name + ' has failed to start uploading')
    }
  };

  this.partUploadFailure = function(part){
    part.retries += 1;
    if(part.retries < 4)
    {
      this.uploader.sendPartToAmazon(part);
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
    var auth = this.encryptAuth(upload.abortStr());
    upload.uploadFailed();
    $.ajax({
      url : 'https://' + upload.config.bucket + '.s3.amazonaws.com/'+encodeURI(upload.awsObjURL)+'?uploadId='+upload.uploadId,
      type: 'DELETE',
      beforeSend: function (xhr) {
        xhr.setRequestHeader("x-amz-date", upload.date);
        xhr.setRequestHeader("Authorization", auth);
      }
    })
  };

  this.customSuccessPartHandler = function(){};

  this.allUploadsFinishedHandler = function(){};

  this.customSuccessHandler = function(){};

  $.extend(this, options);

  _.bindAll(this, "successPartUploadHandler", "successUploadCompleteHandler", "multiPartFailUploadHandler", "allUploadsFinishedHandler");
}