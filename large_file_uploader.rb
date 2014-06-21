
#set :bind, '0.0.0.0'

require 'sinatra'
require 'haml'
require 'base64'
require 'json'
require 'digest/sha1'
require 'pry'
require 'dotenv'

Dotenv.load

set port: 3001
configure :production do
  require 'newrelic_rpm'
end

$ACL = 'public-read-write' # remember to change back private
$BUCKET = ENV['BUCKET'] # bucket cannot be uppercase
$AWS_SECRET = ENV['AWS_SECRET_ACCESS_KEY']    #todo: get this from aaron
$AWS_ACCESS_KEY_ID = ENV['AWS_ACCESS_KEY_ID']
$IV = ENV['IV'] #using a constant IV even though it is less secure because we have no database to store a per-upload IV in
$CIPHER = ENV['CIPHER']

def aws_policy
  conditions = [
      # Change this path if you need, but adjust the javascript config
      ["starts-with", "$key", ''],
      { "bucket" => $BUCKET },
      { "acl" => $ACL }
  ]

  policy = {
      # Valid for 3 hours. Change according to your needs
      'expiration' => (Time.now.utc + 3600 * 3).iso8601,
      'conditions' => conditions
  }

  Base64.encode64(JSON.dump(policy)).gsub("\n","")
end

def aws_signature
  signature(aws_policy)
end

def aws_multipart_signature
  # will time out

  string_to_sign = 'POST' + "\n" +
      "\n" +
      "\n" +
      "\n" +
      'x-amz-date:' + date + "\n" +
  '/' + $BUCKET + '/learn_fog.tar.gz?uploads'

  "AWS #{$AWS_ACCESS_KEY_ID}:#{signature(string_to_sign)}"
end

def signature(policy)
  Base64.encode64(
      OpenSSL::HMAC.digest(
          OpenSSL::Digest.new('sha1'),
          $AWS_SECRET, policy
      )
  ).gsub("\n","")
end

def date
  (Time.now.utc).strftime('%a, %e %b %Y %H:%M:%S %z')
end

def multipart_policy
  'POST' + "\n" +    "\n" +
  'text/html' + "\n" +
  "\n" +
  'x-amz-date:' + date + "\n" +
  '/' + $bucket + '/?upload'
end

get '/' do
  haml :index
end

get '/uploads/new' do
  haml :new_upload
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
  #parses the hashed structure containing the sender, expiration, etc
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
  #set up the S3 bucket for this upload, with correct expiration policy.
  haml :send
end

post '/notifications' do
  message = params[:message]
  #todo: validate the hashed message saying that the upload is complete
  #todo: send email to recipient and sender confirming upload
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
