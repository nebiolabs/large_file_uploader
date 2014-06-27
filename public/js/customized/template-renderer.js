function TemplateRenderer(uploadTemplate) {
  _.templateSettings = {interpolate: /\{\{(.+?)\}\}/g};
  this.$template = $(uploadTemplate);

  this.renderedUploadTemplate = function(fileNumber, file){
    var template = _.template(this.$template.html());
    return template({fileNumber: fileNumber, file: file});
  };

  this.renderXML = function(upload){
      var XML = '<CompleteMultipartUpload>';
      upload.parts.forEach(function(part){
          XML = XML +
            '  <Part>' +
            '    <PartNumber>'+part.partNumber+'</PartNumber>' +
            '    <ETag>'+part.ETag+'</ETag>' +
            '  </Part>';
        }
      );
      return XML + '</CompleteMultipartUpload>';
  };

  _.bindAll(this, "renderedUploadTemplate", "renderXML");
}
