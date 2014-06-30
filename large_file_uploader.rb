
#set :bind, '0.0.0.0'

require 'bundler/setup'
require 'sinatra'
require 'haml'
require 'base64'
require 'json'
require 'pry'
require 'dotenv'
require 'pony'
require 'aws-sdk'

Dotenv.load

set port: 3001
configure :production do
  require 'newrelic_rpm'
end

$BUCKET = ENV['BUCKET'] # bucket cannot be uppercase
$AWS_SECRET = ENV['AWS_SECRET_ACCESS_KEY']    #todo: get this from aaron
$AWS_ACCESS_KEY_ID = ENV['AWS_ACCESS_KEY_ID']
$IV = 'T\xE0\xAEW<mUi\xE3\x93q\xB2\t\x9C\xA0\x88' #using a constant IV even though it is less secure because we have no database to store a per-upload IV in
$CIPHER = 'AES-128-CBC'

get '/' do
  haml :index
end

get '/uploads/new' do
  haml :new_upload
end

post '/uploads' do
  time = Time.now

  source_hash = {
    dest_email:    params[:destination_email].downcase,
    sender_email:  params[:sender_email].downcase,
    keep_days:     params[:keep_file_days],
    max_file_size: params[:max_file_size],
    current_time:  time.strftime('%H%M%S'),
    current_day:   time.strftime('%Y%m%d')
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

  @keep_days = plain_hash[:keep_days].to_i
  @sender_email = plain_hash[:sender_email]
  @dest_email = plain_hash[:dest_email]
  @max_file_size = plain_hash[:max_file_size]

  ###
  @folder_name = "nebupload_#{@sender_email}_#{plain_hash[:current_day]}_#{plain_hash[:current_time]}"
  s3 = AWS::S3.new
  @bucket = s3.buckets[$BUCKET]
  update_folder_expiration unless bucket_rule_exists?

  haml :send
end

post '/notifications/:folder_name/:sender_email/:dest_email' do
  folder_name = URI.decode(params[:folder_name])
  s3 = AWS::S3.new
  bucket = s3.buckets[$BUCKET]

  @url_array = bucket.objects.with_prefix(folder_name).map do |obj|
    {name: obj.key.gsub(folder_name + '/', ''), url: obj.url_for(:get, expires:obj.expiration_date).to_s}
  end

  pony(URI.decode(params[:sender_email]))
  pony(URI.decode(params[:dest_email]))
end


def update_folder_expiration
  @bucket.lifecycle_configuration.update({keep_days: @keep_days, folder_name: @folder_name}) do |args|
    add_rule(args[:folder_name] + '/', expiration_time: args[:keep_days ])
  end
end

def bucket_rule_exists?
  @bucket.lifecycle_configuration.rules.select{|rule|rule.prefix == "#{@folder_name}/"}.length > 0
end

def pony(address)
  Pony.mail to: address,
            via: :smtp,
            subject: 'NEB Upload Ready',
            via_options: {
                address:               'smtp.gmail.com',
                port:                  '587',
                enable_starttls_auto:  true,
                user_name:             ENV['EMAIL_ADDRESS'],
                password:              ENV['EMAIL_PASSWORD'],
                authentication:        :plain, # :plain, :login, :cram_md5, no auth by default
                domain:                "localhost.localdomain" # the HELO domain provided by the client to the server
            },
            html_body: erb(:email)
end