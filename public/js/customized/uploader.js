//ConfigurationRetriever: fetches the configuration for submission
//Configuration model: abstraction to reflect the bucket, accessKey, etc

function Uploader(config, handlerOptions){

  //add check for html5
  this.config           = config;
  this.templateRenderer = new TemplateRenderer('#template');
  this.uploadForm       = new UploaderForm('.upload-form');
  this.handler          = new Handler(handlerOptions);
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
    var auth = this.encryptAuth(upload.initMultiStr);
    return $.ajax({
      url : 'https://' + upload.config.bucket + '.s3.amazonaws.com/'+upload.awsObjURL+'?uploads',
      type: 'post',
      dataType: 'xml',
      context: this,
      beforeSend: function (xhr) {
        xhr.setRequestHeader("x-amz-date", upload.date);
        xhr.setRequestHeader("Authorization", auth);
      },
      success: function(data) {
        upload.uploadId = data.getElementsByTagName("UploadId")[0].innerHTML;
        this.uploadParts(upload);
      }
    });
  };

  this.sendFullFileToAmazon = function(upload){
    //todo: abstract to AmazonFormPayload
//    var fd = new FormData();
//    fd.append('key',            upload.file.name);
//    fd.append('AWSAccessKeyId', this.accessKey);
//    fd.append('acl',            this.acl);
//    fd.append('file',           upload.file);

    //todo: abstract to AmazonUpload
//    var payload = new AmazonFormPayload(amazonFile, configuration);
//    var uploader = new AmazonFormUpload()
//    uploader.upload();

    var auth = this.encryptAuth(upload.initSingleStr);
    $.ajax({
      xhr: function(){
        var xhr = $.ajaxSettings.xhr() ;
        xhr.upload.addEventListener("progress", upload.progressHandler);
        return xhr ;
      },
      url: 'https://' + upload.config.bucket + '.s3.amazonaws.com/'+ upload.awsObjURL,
      type: 'PUT',
      data: upload.file,
      context: this,
      contentType:'multipart/form-data',
      processData: false,
      beforeSend: function (xhr) {
        xhr.setRequestHeader("x-amz-date", upload.date);
        xhr.setRequestHeader("Authorization", auth);
      },
      success: function() {
        this.handler.successUploadCompleteHandler(this, upload)
      },
      fail: function(){
        upload.uploadFailed();
      }
    })
  };

  this.uploadParts = function(upload){
    for(var partNumber=1; partNumber <= upload.totalChunks; partNumber++){
      var part = new UploadPart(upload.file, partNumber, upload);
      upload.parts.push(part);
      this.sendPartToAmazon(part);
    }
  };

  this.completeMultipart = function(upload){
    var auth = this.encryptAuth(upload.finishMultiStr());
    var data = this.templateRenderer.renderXML(upload);

    $.ajax({
      url : 'https://' + upload.config.bucket + '.s3.amazonaws.com/'+upload.awsObjURL+'?uploadId='+upload.uploadId,
      type: 'POST',
      dataType: 'xml',
      data: data,
      contentType: false,
      context: this,
      beforeSend: function (xhr) {
        xhr.setRequestHeader("x-amz-date", upload.date);
        xhr.setRequestHeader("Authorization", auth);
      },
      success: function() {
        this.handler.successUploadCompleteHandler(this, upload)
      },
      fail: function() {
        this.handler.multiPartFailUploadHandler(upload)
      }
    })
  };

  this.sendPartToAmazon = function(part){
    var auth = this.encryptAuth(part.stringToSign());

    $.ajax({
      url: part.url(),
      type: 'PUT',
      dataType: 'xml',
      data: part.blob,
      contentType:'multipart/form-data',
      processData: false,
      beforeSend: function (xhr) {
        xhr.setRequestHeader("x-amz-date", part.upload.date);
        xhr.setRequestHeader("Authorization", auth);
      },
      context: this,
      success: function(data, textStatus, jqXHR) {
        this.handler.successPartUploadHandler(part, jqXHR, this.completeMultipart)
      },
      fail: function() {
        this.handler.multiPartFailUploadHandler(part.upload)
      }
    })
  };

  this.removeUpload = function(e){
    e.preventDefault();
    var upload = e.data.upload;
    upload.$el.remove();
    this.uploadQueue = _.without(this.uploadQueue, upload)
  };

  this.encryptAuth = function(stringToSign){
    var crypto = CryptoJS.HmacSHA1(stringToSign, this.config.secretKey).toString(CryptoJS.enc.Base64);
    return 'AWS'+' '+this.config.accessKey+':'+crypto
  };


  _.bindAll(this, "sendPartToAmazon", "removeUpload", "addUploadToView", "createUpload");
  _.bindAll(this, "getFile", "startUploads", "initiateMultipartUpload", "sendFullFileToAmazon");
  _.bindAll(this, "encryptAuth", "uploadParts", "completeMultipart");

  this.uploadForm.$fileInput.on('change', this.getFile);
  this.uploadForm.$container.on('drop', this.getFile);
  this.uploadForm.$el.on('submit', this.startUploads);

}
