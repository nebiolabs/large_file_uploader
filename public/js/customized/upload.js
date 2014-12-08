function Upload(el, file, config){
  this.$el              = $(el);
  this.$deleteButton    = this.$el.find('.delete-upload');
  this.$progressBar     = this.$el.find('.progress-bar');
  this.$status          = this.$el.find('.status');
  this.file             = file;
  this.parts            = [];
  this.config           = config;
  this.date             = new Date().toUTCString();
  this.totalChunks      = Math.ceil(this.file.size / this.config.multipartMinSize);
  this.canUseMultipart  = this.file.size > this.config.multipartMinSize;
  this.completedParts   = [];
  this.awsObjURL        = encodeURI(this.config.folderName + '/' + this.file.name).replace(/%20/g, "_");
  this.initSingleStr    = 'PUT\n\nmultipart/form-data\n\nx-amz-date:'+this.date+'\n/'+this.config.bucket+'/'+this.awsObjURL;
  this.initMultiStr     = 'POST\n\n\n\nx-amz-date:'+this.date+'\n/'+this.config.bucket+'/'+this.awsObjURL+'?uploads';
  this.abortStr         = function(){
    return 'DELETE\n\n\n\nx-amz-date:'+this.date+
           '\n/'+this.config.bucket+'/'+
           this.awsObjURL+
           '?uploadId='+this.uploadId;
  };

  this.finishMultiStr   = function(){
    return 'POST\n\ntext/plain;charset=UTF-8\n\nx-amz-date:'+this.date+
           '\n/'+this.config.bucket+'/'+
           this.awsObjURL+
           '?uploadId='+this.uploadId;
  };

  this.progressHandler = function(e){
    var percent = Math.round((e.loaded / e.total) * 100)+'%';

    this.$status.html(percent);
    this.$progressBar.width(percent)
  };

  this.uploadFailed = function(){
    this.$progressBar.css('background-color', '#d9534f');
    this.$status.html('Upload Failed');
  };

  _.bindAll(this, "progressHandler", "uploadFailed");
}
