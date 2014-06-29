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

  _.bindAll(this, "successPartUploadHandler", "successUploadCompleteHandler");
}