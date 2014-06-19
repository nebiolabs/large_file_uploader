$( document ).ready(function() {

  var maxFileSize = '<%= @max_file_size %>';
  var multipartMinSize = 5 * 1024 * 1024;
  var bucket = '<%= $BUCKET %>';
  var secretKey = '<%= $AWS_SECRET %>';
  var awsPolicy = '<%= aws_policy %>';
  var awsSignature = '<%= aws_signature %>';

  function Uploader(){
    this.uploadForm = new UploaderForm('.upload-form');
    this.fileQueue = [];

    this.getFiles = function(e){
      e.preventDefault();
      var fileList = e.target.files;  //file list object

      for (var i = 0; i < fileList.length; i++) {
        var file = new File(fileList[i]);
        this.fileQueue.push(file);
        file.sendToAmazon()
      }

    };

    _.bindAll(this, "getFiles");

    this.uploadForm.$fileInput.change(this.getFiles);
  }

  function UploaderForm(el){
    this.$el = $(el);
    this.$fileInput = $('#files');
  }

  function File(file){
    this.htmlFile = file;
    this.name = this.htmlFile.name;
    this.size = this.htmlFile.size;
    this.fileReader = new FileReader();
    this.canUseMultipart = function(){
      return this.size > multipartMinSize;
    };
    this.sendToAmazon = function(){
//      if(this.canUseMultipart()){
        $.ajax({
          url : 'https://s3.amazonaws.com/' + bucket + '/',
          type: 'post',
          crossDomain: true,
          dataType: 'json',
          data: {
            key: this.name,
            AWSAccessKeyId: secretKey,
            acl: 'public-read',
            policy: awsPolicy,
            signature: awsSignature
          },
          success:function(data) {
            console.log('WORKS')
          }
        });
//      }
    };
  }

  new Uploader();
});