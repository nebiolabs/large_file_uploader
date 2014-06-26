function Handler(){
  this.successPartUploadHandler = function(part, jqXHR){
    part.ETag = jqXHR.getResponseHeader('ETag').replace(/"/g, '');
    part.upload.completedParts.push(part);
    if (part.upload.totalChunks === part.upload.completedParts.length){
      this.completeMultipart(part.upload)
    }
  };

  _.bindAll(this, "successPartUploadHandler");
}