function Upload(el, file){
  this.$el              = $(el);
  this.file             = file;
  this.parts            = [];
  this.date             = new Date().toUTCString();
  this.$delete          = this.$el.find('.btn-danger');
  this.bucket           = 'neb-test-upload2'; //for now set bucket
  this.multipartMinSize = 5 * 1024 * 1024;
  this.totalChunks      = Math.ceil(this.file.size / this.multipartMinSize);
  this.canUseMultipart  = this.file.size > this.multipartMinSize;
  this.completedParts   = [];
  this.initSingleStr    = 'PUT\n\nmultipart/form-data\n\nx-amz-date:'+this.date+'\n/'+this.bucket+'/'+encodeURI(this.file.name);
  this.initMultiStr     = 'POST\n\n\n\nx-amz-date:'+this.date+'\n/'+this.bucket+'/'+encodeURI(this.file.name)+'?uploads';
  this.abortStr         = function(){return 'DELETE\n\n\n\nx-amz-date:'+this.date+'\n/'+this.bucket+'/'+encodeURI(this.file.name)+'?uploadId='+this.uploadId;};
  this.finishMultiStr   = function(){return 'POST\n\ntext/plain;charset=UTF-8\n\nx-amz-date:'+this.date+'\n/'+this.bucket+'/'+encodeURI(this.file.name)+'?uploadId='+this.uploadId;};

  this.XML = function(){
    var XML = '<CompleteMultipartUpload>';
    this.parts.forEach(function(part){
       XML = XML +
         '  <Part>' +
         '    <PartNumber>'+part.partNumber+'</PartNumber>' +
         '    <ETag>'+part.ETag+'</ETag>' +
         '  </Part>';
      }
    );
    return XML + '</CompleteMultipartUpload>';
  };

  this.progressHandler = function(e){
    var percent = Math.round((e.loaded / e.total) * 100)+'%';

    this.$el.find('.status').html(percent);
    this.$el.find('.progress-bar').width(percent)
  };

  _.bindAll(this, "XML", "progressHandler");
}
