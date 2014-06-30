function Upload(el, file, config){
  this.$el              = $(el);
  this.file             = file;
  this.parts            = [];
  this.config           = config;
  this.date             = new Date().toUTCString();
  this.$deleteButton    = this.$el.find('.btn-danger');
  this.totalChunks      = Math.ceil(this.file.size / this.config.multipartMinSize);
  this.canUseMultipart  = this.file.size > this.config.multipartMinSize;
  this.completedParts   = [];
  this.awsObjURL        = encodeURI(this.config.folderName + '/' + this.file.name);
  this.initSingleStr    = 'PUT\n\nmultipart/form-data\n\nx-amz-date:'+this.date+'\n/'+this.config.bucket+'/'+encodeURI(this.awsObjURL);
  this.initMultiStr     = 'POST\n\n\n\nx-amz-date:'+this.date+'\n/'+this.config.bucket+'/'+encodeURI(this.awsObjURL)+'?uploads';
  this.abortStr         = function(){return 'DELETE\n\n\n\nx-amz-date:'+this.date+'\n/'+this.config.bucket+'/'+encodeURI(this.awsObjURL)+'?uploadId='+this.uploadId;};
  this.finishMultiStr   = function(){return 'POST\n\ntext/plain;charset=UTF-8\n\nx-amz-date:'+this.date+'\n/'+this.config.bucket+'/'+encodeURI(this.awsObjURL)+'?uploadId='+this.uploadId;};

  this.progressHandler = function(e){
    var percent = Math.round((e.loaded / e.total) * 100)+'%';

    this.$el.find('.status').html(percent);
    this.$el.find('.progress-bar').width(percent)
  };

  _.bindAll(this, "progressHandler");
}
