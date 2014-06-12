class Uploader

  def initialize(params)
    @data = params[:file][:tempfile]
    @bucket = AWS::S3.new.buckets[ENV['BUCKET']]
    @aws_obj = @bucket.objects[params[:filename]]
    @upload_id = params[:upload_id]
    @total = params[:total]
    @offset = params[:offset]
  end

  def requires_multipart_upload?
    @total != nil
  end

  def last_chunk?
    (@total.to_i - @offset.to_i) < $CHUNK_SIZE
  end

  def upload_id
    requires_multipart_upload? ? upload.id : ''
  end

  def upload_to_amazon
    if requires_multipart_upload?
      if last_chunk?
        upload.add_part(@data)
        upload.complete(:remote_parts)
      else
        upload.add_part(@data)
      end
    else
      @bucket.objects[params[:filename]].write(Pathname.new(data))
    end
  end

  def upload
    @upload ||= @upload_id ? @aws_obj.multipart_uploads[@upload_id] : @aws_obj.multipart_upload
  end
end