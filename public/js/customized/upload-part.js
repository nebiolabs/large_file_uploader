function UploadPart(file, partNumber, upload) {
  this.file = file;
  this.partNumber = partNumber;
  this.upload = upload;
  this.startByte = (this.multipartMinSize * (partNumber-1));
  this.endByte = this.multipartMinSize * (partNumber);
  this.blob = this.file.slice(this.startByte, this.endByte);
  this.ETag = '';

  this.ajaxToAmazon = function(data, partNumber){
    var stringToSign = 'PUT\n\ntext/plain;charset=UTF-8\n\nx-amz-date:'+this.upload.date+'\n/'+this.upload.bucket+'/'+this.file.name+'?partNumber='+this.partNumber+'&uploadId='+this.upload.uploadId;  //Add CONTENT MD5
    var auth = this.upload.encryptAuth(stringToSign);

    $.ajax({
      url : 'https://'+this.upload.bucket+'.s3.amazonaws.com/'+this.file.name+'?partNumber='+this.partNumber+'&uploadId='+this.upload.uploadId,
      type: 'PUT',
      dataType: 'xml',
      data: data,
      beforeSend: function (xhr) {
        xhr.setRequestHeader("x-amz-date", this.upload.date);
        xhr.setRequestHeader("Authorization", auth);
      },
      contentType:false,
      context: this,
      success: function(data, textStatus, jqXHR ) {
        this.ETag = jqXHR.getResponseHeader('ETag').replace(/"/g, '');
      },
      error: function(data, textStatus, jqXHR ) {
      }
    })
  };

  this.sendPartToAmazon = function(callback, partNumber){
    var reader = new FileReader();
    reader.onload = function(e){callback(e.target.result, partNumber);};
    reader.readAsDataURL(this.blob);
  };

  _.bindAll(this, "sendPartToAmazon", "ajaxToAmazon");

  this.sendPartToAmazon(this.ajaxToAmazon, this.partNumber)
}