function Handler(){
  this.successPartUploadHandler = function(part, jqXHR, callback){
    part.ETag = jqXHR.getResponseHeader('ETag').replace(/"/g, '');
    part.upload.completedParts.push(part);
    var percent = Math.round((part.upload.completedParts.length / part.upload.totalChunks ) * 100)+'%';
    part.upload.$el.find('.status').html(percent);
    part.upload.$el.find('.progress-bar').width(percent);

    if (part.upload.totalChunks === part.upload.completedParts.length){
      callback(part.upload)
    }
  };

  this.successUploadCompleteHandler = function(uploader, upload){
    uploader.completedUploads.push(upload);
    if (uploader.completedUploads.length === uploader.uploadQueue.length){
      uploader.sendCompletionEmail();
      uploader.completedUploads = [];
    }
  };

  this.multiPartFailUploadHandler = function(upload){
    var auth = this.encryptAuth(upload.abortStr());
    $.ajax({
      url : 'https://' + upload.config.bucket + '.s3.amazonaws.com/'+encodeURI(upload.awsObjURL)+'?uploadId='+upload.uploadId,
      type: 'DELETE',
      beforeSend: function (xhr) {
        xhr.setRequestHeader("x-amz-date", upload.date);
        xhr.setRequestHeader("Authorization", auth);
      }
    })
  };

  _.bindAll(this, "successPartUploadHandler", "successUploadCompleteHandler", "multiPartFailUploadHandler");
}