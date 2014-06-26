function UploaderForm(el){
  this.$el = $(el);
  this.$fileInput = $('#fileupload');
  this.$table = $('.upload-table');
  this.$tbody = this.$table.children('tbody')
}