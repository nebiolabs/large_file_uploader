function Upload(el, file, config){
  this.$el              = $(el);
  this.$deleteButton    = this.$el.find('.delete-upload');
  this.$progressBar     = this.$el.find('.progress-bar');
  this.$status          = this.$el.find('.status');
  this.file             = file;
  this.parts            = [];
  this.config           = config;
  this.awsObjURL        = encodeURI(this.config.folderName + '/' + this.file.name).replace(/%20/g, "_");
  this.totalChunks      = Math.ceil(this.file.size / this.config.multipartMinSize);
  this.canUseMultipart  = this.file.size > this.config.multipartMinSize;
  this.completedParts   = [];
  this.retries     = 0;

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
