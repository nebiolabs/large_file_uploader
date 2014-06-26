//ConfigurationRetriever: fetches the configuration for submission
//Configuration model: abstraction to reflect the bucket, accessKey, etc
function Uploader(config){

  //add check for html5
  this.config = config;
  this.templateRenderer = new TemplateRenderer('#template');
  this.uploadForm = new UploaderForm('.upload-form');
  this.uploadQueue = [];
  this.uploadCounter = 0;

  this.getFile = function(e){
    e.preventDefault();
    var fileList = e.target.files;

    for (var i = 0; i < fileList.length; i++) {
      var file = fileList[i];
      var fileNumber = this.uploadCounter++;

      if(file.size > this.config.maxFileSize){
        alert('THIS FILE IS TOO LARGE YO')
      } else {
        this.addUploadtoView(fileNumber, file);
        this.initUpload(fileNumber, file);
      }
    }
  };

  this.addUploadtoView = function(fileNumber, file){
    var template = this.templateRenderer.renderedUploadTemplate(fileNumber, file);
    this.uploadForm.$tbody.append(template);
  };

  this.initUpload = function(fileNumber, file){
    var upload = new Upload('.upload-'+fileNumber, file, this.config);
    upload.$delete.on('click', {upload: upload}, this.removeUpload);
    this.uploadQueue.push(upload);
  };

  this.startUploads = function(e){
    e.preventDefault();
    for (var i = 0; i < this.uploadQueue.length; i++) {
      var upload = this.uploadQueue[i];
      upload.canUseMultipart ? this.initiateMultipartUpload(upload) : this.sendFullFileToAmazon(upload);
    }
  };

  this.initiateMultipartUpload = function(upload){
    var auth = this.encryptAuth(upload.initMultiStr);
    return $.ajax({
      url : 'https://' + upload.config.bucket + '.s3.amazonaws.com/'+upload.file.name+'?uploads',
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

//    xhr.upload.addEventListener("progress", upload.progressHandler, false);
//    add back progress handler
    var auth = this.encryptAuth(upload.initSingleStr);
    $.ajax({
      url: 'https://' + upload.config.bucket + '.s3.amazonaws.com/'+ upload.file.name,
      type: 'PUT',
      data: upload.file,
      contentType:'multipart/form-data',
      processData: false,
      beforeSend: function (xhr) {
        xhr.setRequestHeader("x-amz-date", upload.date);
        xhr.setRequestHeader("Authorization", auth);
      }
    })
  };

  this.multipartAbort = function(upload){
    var auth = this.encryptAuth(upload.abortStr());
    $.ajax({
      url : 'https://' + upload.config.bucket + '.s3.amazonaws.com/'+upload.file.name+'?uploadId='+upload.uploadId,
      type: 'DELETE',
      beforeSend: function (xhr) {
        xhr.setRequestHeader("x-amz-date", upload.date);
        xhr.setRequestHeader("Authorization", auth);
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
    var data = upload.XML();

    $.ajax({
      url : 'https://' + upload.config.bucket + '.s3.amazonaws.com/'+upload.file.name+'?uploadId='+upload.uploadId,
      type: 'POST',
      dataType: 'xml',
      data: data,
      contentType: false,
      beforeSend: function (xhr) {
        xhr.setRequestHeader("x-amz-date", upload.date);
        xhr.setRequestHeader("Authorization", auth);
      },
      success: function(data, textStatus, jqXHR ) {
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
      success: function(data, textStatus, jqXHR ) {
        part.ETag = jqXHR.getResponseHeader('ETag').replace(/"/g, '');
        part.upload.completedParts.push(part);
        if (part.upload.totalChunks === part.upload.completedParts.length){
          this.completeMultipart(part.upload)
        }
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

  _.bindAll(this, "sendPartToAmazon", "removeUpload", "addUploadtoView", "initUpload");
  _.bindAll(this, "getFile", "startUploads", "initiateMultipartUpload", "sendFullFileToAmazon");
  _.bindAll(this, "encryptAuth", "multipartAbort", "uploadParts", "completeMultipart");

  this.uploadForm.$fileInput.on('change', this.getFile);
  this.uploadForm.$el.on('submit', this.startUploads);
}