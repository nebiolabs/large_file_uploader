function UploaderForm(el){
  this.$el = $(el);
  this.$fileInput = $('.fileinput-button');
  this.$table = $('.upload-table');
  this.$tbody = this.$table.children('tbody')
}