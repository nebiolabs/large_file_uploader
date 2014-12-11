//ConfigurationRetriever: fetches the configuration for submission
//Configuration model: abstraction to reflect the bucket, accessKey, etc

function Uploader(config, handlerOptions){

  //add check for html5
  this.config           = config;
  this.templateRenderer = new TemplateRenderer('#upload-template');
  this.uploadForm       = new UploaderForm('#upload-form');
  this.handler          = new Handler(this, handlerOptions);
  this.uploadQueue      = [];
  this.completedUploads = [];
  this.uploadCounter    = 0;

  this.getFile = function(e){
    e.preventDefault();

    var fileList;
    if(e.target.files === undefined){
      fileList = e.originalEvent.dataTransfer.files;
      this.uploadForm.$container.removeClass('dragover');
    } else {
      fileList = e.target.files;
    }

    for (var i = 0; i < fileList.length; i++) {
      var file = fileList[i];
      var fileNumber = this.uploadCounter++;

      if(file.size > this.config.maxFileSize){
        alert('THIS FILE IS TOO LARGE')
      } else {
        this.addUploadToView(fileNumber, file);
        this.createUpload(fileNumber, file);
      }
    }
  };

  this.addUploadToView = function(fileNumber, file){
    var template = this.templateRenderer.renderedUploadTemplate(fileNumber, file);
    this.uploadForm.$tbody.append(template);
  };

  this.createUpload = function(fileNumber, file){
    var upload = new Upload('.upload-'+fileNumber, file, this.config);
    upload.$deleteButton.on('click', {upload: upload}, this.removeUpload);
    this.uploadQueue.push(upload);
  };

  this.startUploads = function(e){
    e.preventDefault();

    if (0 < this.uploadQueue.length) {
      this.uploadForm.$fileInput.hide();
      this.uploadForm.$submit.hide();
      for (var i = 0; i < this.uploadQueue.length; i++) {
        var upload = this.uploadQueue[i];
        upload.canUseMultipart ? this.initiateMultipartUpload(upload) : this.sendFullFileToAmazon(upload);
      }
      this.uploadQueue.forEach(function(upload){upload.$deleteButton.hide()});
    }
  };

  this.initiateMultipartUpload = function(upload){
    var signer = new Signer(upload);
    var auth = signer.encryptAuth(signer.initMultiStr);
    return $.ajax({
      url : signer.multipartInitURL,
      type: 'post',
      dataType: 'xml',
      context: this,
      beforeSend: function (xhr) {
        xhr.setRequestHeader("x-amz-date", signer.date);
        xhr.setRequestHeader("Authorization", auth);
      },
      success: function(data) {
        upload.uploadId = data.getElementsByTagName("UploadId")[0].innerHTML;
        this.uploadParts(upload);
      },
      error: function(){
        this.handler.initUploadFailureHandler(upload, this.initiateMultipartUpload)
      }
    });
  };

  this.sendFullFileToAmazon = function(upload){
    var signer = new Signer(upload);
    var auth = signer.encryptAuth(signer.initSingleStr);
    $.ajax({
      xhr: function(){
        var xhr = $.ajaxSettings.xhr() ;
        xhr.upload.addEventListener("progress", upload.progressHandler);
        return xhr ;
      },
      url: signer.singlepartInitURL,
      type: 'PUT',
      data: upload.file,
      context: this,
      contentType:'multipart/form-data',
      processData: false,
      beforeSend: function (xhr) {
        xhr.setRequestHeader("x-amz-date", signer.date);
        xhr.setRequestHeader("Authorization", auth);
      },
      success: function() {
        this.handler.successUploadCompleteHandler(upload)
      },
      error: function(){
        this.handler.initUploadFailureHandler(upload, this.sendFullFileToAmazon);
      }
    })
  };

  this.uploadParts = function(upload){
    for(var partNumber=1; partNumber <= upload.totalChunks; partNumber++){
      this.timedUploadPart(partNumber, upload);
    }
  };

  this.timedUploadPart = function(partNumber, upload){
    var uploader = this;
    setTimeout(function(){
      var part = new UploadPart(upload.file, partNumber, upload);
      upload.parts.push(part);
      uploader.sendPartToAmazon(part);
    }, 5000 * partNumber);
  };

  this.completeMultipart = function(upload){
    var signer = new Signer(upload);
    var auth = signer.encryptAuth(signer.finishMultiStr());
    var data = this.templateRenderer.renderXML(upload);

    $.ajax({
      url : signer.partUploadURL,
      type: 'POST',
      dataType: 'xml',
      data: data,
      contentType: false,
      context: this,
      beforeSend: function (xhr) {
        xhr.setRequestHeader("x-amz-date", signer.date);
        xhr.setRequestHeader("Authorization", auth);
      },
      success: function() {
        this.handler.successUploadCompleteHandler(upload)
      },
      error: function() {
        this.handler.multiPartFailUploadHandler(upload)
      }
    })
  };

  this.sendPartToAmazon = function(part){
    var signer = new Signer(part.upload);
    var auth = signer.encryptAuth(signer.partStr(part));

    $.ajax({
      url: signer.partURL(part),
      type: 'PUT',
      dataType: 'xml',
      data: part.blob,
      contentType:'multipart/form-data',
      processData: false,
      beforeSend: function (xhr) {
        xhr.setRequestHeader("x-amz-date", signer.date);
        xhr.setRequestHeader("Authorization", auth);
      },
      context: this,
      success: function(data, textStatus, jqXHR) {
        this.handler.successPartUploadHandler(part, jqXHR, this.completeMultipart)
      },
      error: function() {
        this.handler.partUploadFailure(part)
      }
    })
  };

  this.removeUpload = function(e){
    e.preventDefault();
    var upload = e.data.upload;
    upload.$el.remove();
    this.uploadQueue = _.without(this.uploadQueue, upload)
  };

  _.bindAll(this, "sendPartToAmazon", "removeUpload", "addUploadToView", "createUpload");
  _.bindAll(this, "getFile", "startUploads", "initiateMultipartUpload", "sendFullFileToAmazon");
  _.bindAll(this, "uploadParts", "timedUploadPart", "completeMultipart");

  this.uploadForm.$fileInput.on('change', this.getFile);
  this.uploadForm.$container.on('drop', this.getFile);
  this.uploadForm.$el.on('submit', this.startUploads);

}
