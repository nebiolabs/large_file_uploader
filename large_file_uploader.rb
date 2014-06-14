
#set :bind, '0.0.0.0'

require 'sinatra'
require 'erb'
require 'base64'
require 'json'
require 'digest/sha1'
require 'pry'
require 'dotenv'
require 'aws-sdk'
require 'pony'
require_relative 'models/uploader'

Dotenv.load

set port: 3001
configure :production do
  require 'newrelic_rpm'
end

$AWS_SECRET = ENV['AWS_SECRET_ACCESS_KEY']    #todo: get this from aaron
$IV = ENV['IV'] #using a constant IV even though it is less secure because we have no database to store a per-upload IV in
$CIPHER = ENV['CIPHER']
$CHUNK_SIZE = (100 * 1024 * 1024)#in bytes

get '/' do
  erb :index
end

get '/uploads/new' do
  erb :new_upload
end

post '/uploads' do
  source_hash = {
      dest_email: params[:destination_email],
      sender_email: params[:sender_email],
      keep_days: params[:keep_file_days],
      max_file_size: params[:max_file_size]
  }
  source_string = source_hash.map{|k,v| "#{k}:#{v}"}.join(';')

  cipher = OpenSSL::Cipher.new $CIPHER
  cipher.encrypt
  cipher.key = $AWS_SECRET
  cipher.iv = $IV
  encrypted_string = cipher.update(source_string)+cipher.final

  content_type :json
  {upload_key: Base64.urlsafe_encode64(encrypted_string)}.to_json
end

get '/send/:upload_key' do |upload_key|
  upload_string = Base64.urlsafe_decode64(upload_key)

  decipher = OpenSSL::Cipher.new $CIPHER
  decipher.decrypt
  decipher.key = $AWS_SECRET
  decipher.iv = $IV
  plain = decipher.update(upload_string) + decipher.final

  plain_hash =  plain.split(';').inject(Hash.new){|hsh,elem| k,v = elem.split(':'); hsh[k.to_sym] = v; hsh}
  @keep_days = plain_hash[:keep_days]
  @sender_email = plain_hash[:sender_email]
  @max_file_size = plain_hash[:max_file_size]
  @dest_email = plain_hash[:dest_email]

  erb :send
end

post '/notifications' do
  send_email(params[:sender_email])
  send_email(params[:dest_email])
  # message = params[:message]
  #todo: validate the hashed message saying that the upload is complete
end

post '/uploads_temp' do
  data = params[:file][:tempfile]
  filename = params[:filename]

  upload_path = "uploads_temp/"
  mode = "ab"

  File.open(upload_path + filename, mode) do |file|
    file.write(data.read)
  end

  200
end

post '/amazon_upload' do
  uploader = Uploader.new(params)
  uploader.upload_to_amazon
  content_type :json
  {id: uploader.upload_id, part_number: uploader.part_number }.to_json
end

def send_email(address)
  Pony.mail({
      :to => address,
      :subject => 'testing',
      :body => 'Email Ready.',
      :via => :smtp,
      :via_options => {
          :address              => 'smtp.gmail.com',
          :port                 => '587',
          :enable_starttls_auto => true,
          :user_name            => ENV['EMAIL_ADDRESS'],
          :password             => ENV['EMAIL_PASSWORD'],
          :authentication       => :plain, # :plain, :login, :cram_md5, no auth by default
          :domain               => "gmail.com" # the HELO domain provided by the client to the server
      }
  })
end

def clipboard_link(text, bgcolor='#FFFFFF')
  <<-EOF
      <object classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000"
              width="110"
              height="14"
              id="clippy" >
      <param name="movie" value="/flash/clippy.swf"/>
      <param name="allowScriptAccess" value="always" />
      <param name="quality" value="high" />
      <param name="scale" value="noscale" />
      <param NAME="FlashVars" value="text=#{text}">
      <param name="bgcolor" value="#{bgcolor}">
      <embed src="/flash/clippy.swf"
             width="110"
             height="14"
             name="clippy"
             quality="high"
             allowScriptAccess="always"
             type="application/x-shockwave-flash"
             pluginspage="http://www.macromedia.com/go/getflashplayer"
             FlashVars="text=#{text}"
             bgcolor="#{bgcolor}"
      />
      </object>
  EOF
end


