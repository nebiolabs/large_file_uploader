function UploaderForm(el){
  this.$el = $(el);
  this.$fileInput = $('.fileinput-button');
  this.$container = $('.upload-container');
  this.$table = $('.upload-table');
  this.$tbody = this.$table.children('tbody');
  this.$submit = $('.start');

  this.dragOver = function(e){
    e.preventDefault();
    e.stopPropagation();
    this.$container.addClass('dragover');
  };

  this.dragEnter = function(e){
    e.preventDefault();
    e.stopPropagation();
  };

  _.bindAll(this, "dragOver", "dragEnter");

  this.$container.on('dragover', this.dragOver);
  this.$container.on('dragenter', this.dragEnter);

}