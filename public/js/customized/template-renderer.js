function TemplateRenderer(uploadTemplate) {
  _.templateSettings = {interpolate: /\{\{(.+?)\}\}/g};
  this.$template = $(uploadTemplate);

  this.renderedUploadTemplate = function(fileNumber, file){
    var template = _.template(this.$template.html());
    return template({fileNumber: fileNumber, file: file});
  };

  _.bindAll(this, "renderedUploadTemplate");
}
