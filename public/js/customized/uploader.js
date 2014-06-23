function Uploader(){

  $.ajax({
    url: '/api/variables',
    dataType: 'json',
    context: this,
    success: function(data, textStatus, jqXHR ) {
      this.multipartMinSize = data.multipartMinSize;
      this.maxFileSize      = data.maxFileSize;
      this.bucket           = data.bucket;
      this.accessKey        = data.accessKey;
      this.secretKey        = data.secretKey;
      this.awsPolicy        = data.awsPolicy;
      this.awsSignature     = data.awsSignature;
      this.acl              = data.acl;
      this.date             = data.date;
    }
  });

  this.uploadForm = new UploaderForm('.upload-form');
  this.$uploadTable = $('.upload-table');
  this.fileQueue = [];

  this.getFile = function(e){
    e.preventDefault();
    var fileList = e.target.files;

    for (var i = 0; i < fileList.length; i++) {
      var file = fileList[i];
      var fileNumber = this.fileQueue.length;
      this.$uploadTable.children('tbody').append(
          '<tr class=upload-'+fileNumber+'>' +
          ' <td>'+file.name+'</td>' +
          '  <td>'+(file.size/1024/1024).toFixed(2)+'MB</td>' +
          '  <td>' +
          '    <div class="progress progress-striped active mts">' +
          '      <div class="progress-bar" "aria-valuemax"="100" "aria-valuemin"= 0" "aria-valuenow"="45" style="width: 45%">' +
          '        <span class="sr-only"></span>' +
          '        45%</div>' +
          '    </div>' +
          '  </td>' +
          '</tr>'
      );
      this.fileQueue.push(file);
    }
  };

  this.startUploads = function(e){
    e.preventDefault();
    for (var i = 0; i < this.fileQueue.length; i++) {
      var upload = new Upload($('.upload-'+i), this.fileQueue[i], this);
      upload.canUseMultipart() ? upload.initiateMultipartUpload() : upload.sendFullFileToAmazon();
    }
  };

  _.bindAll(this, "getFile", "startUploads");

  this.uploadForm.$fileInput.change(this.getFile);
  this.uploadForm.$el.submit(this.startUploads)
}