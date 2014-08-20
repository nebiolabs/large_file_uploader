
class Upload

  attr_reader :dest_email, :sender_email, :link_valid_days, :link_created_at, :keep_days, :max_file_size   #todo figure out how to do this with a single array
  RO_FIELDS = [:dest_email, :sender_email, :link_valid_days, :link_created_at, :keep_days, :max_file_size]

  def initialize(dest_email, sender_email, link_created_at, link_valid_days, keep_file_days, max_file_size)


    @dest_email      = dest_email
    @sender_email    = sender_email
    @link_created_at = link_created_at
    @link_valid_days = link_valid_days.to_i
    @keep_days       = keep_file_days.to_i
    @max_file_size   = max_file_size.to_i

    unless @link_created_at.is_a?(DateTime)
      @link_created_at = DateTime.parse(@link_created_at)
    end
  end

  def creation_time
    @link_created_at.strftime('%H%M%S')
  end

  def creation_day
    @link_created_at.strftime('%Y%m%d')
  end

  def link_expired?
    DateTime.now > @link_created_at + @link_valid_days*24
  end

  def valid_link?
    @dest_email.include?('@') && @sender_email.include?('@') && @keep_days > 0 && @max_file_size > 0 && @link_valid_days > 0
  end

  def link_invalid?
    ! self.valid_link?
  end

  def encode
    source_string = RO_FIELDS.map{|f| "#{f}:#{self.send(f)}"}.join(';')

    cipher = OpenSSL::Cipher.new $CIPHER
    cipher.encrypt
    cipher.key = $AWS_SECRET
    cipher.iv = $IV
    encrypted_string = cipher.update(source_string)+cipher.final

    Base64.urlsafe_encode64(encrypted_string)
  end

  #returns an Upload object derived from the values encoded in the upload key
  def self.decode(upload_key)
    upload_string = Base64.urlsafe_decode64(upload_key)

    decipher = OpenSSL::Cipher.new $CIPHER
    decipher.decrypt
    decipher.key = $AWS_SECRET
    decipher.iv = $IV
    plain = decipher.update(upload_string) + decipher.final

    plain_hash = plain.split(';').inject(Hash.new){|hsh,elem| k,v = elem.split(':',2); hsh[k.to_sym] = v; hsh}
    Upload.new(plain_hash[:dest_email], plain_hash[:sender_email], DateTime.parse(plain_hash[:link_created_at].to_s), plain_hash[:link_valid_days], plain_hash[:keep_days], plain_hash[:max_file_size])

  end

end