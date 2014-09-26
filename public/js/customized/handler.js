function Handler(options){
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

  this.successUploadCompleteHandler = function(uploader, upload){
    uploader.completedUploads.push(upload);
    this.customSuccessHandler();
    if (uploader.completedUploads.length === uploader.uploadQueue.length){
      this.allUploadsFinishedHandler();
      uploader.completedUploads = [];
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