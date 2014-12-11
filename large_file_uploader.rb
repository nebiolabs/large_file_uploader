require 'bundler/setup'
require 'sinatra'
require 'haml'
require 'base64'
require 'json'
require 'pry' if development?
require 'dotenv'
require 'pony'
require 'aws-sdk'
require 'ip'
require 'date'
require File.expand_path '../lib/upload.rb', __FILE__

#set :bind, '0.0.0.0'
Dotenv.load   #loads configuration from .env file

set port: 3001
configure :production do
  require 'newrelic_rpm'
end

$BUCKET = ENV['BUCKET'] # bucket cannot be uppercase
$AWS_SECRET = ENV['AWS_SECRET_ACCESS_KEY']
$AWS_ACCESS_KEY_ID = ENV['AWS_ACCESS_KEY_ID']
$IV = 'T\xE0\xAEW<mUi\xE3\x93q\xB2\t\x9C\xA0\x88' #using a constant IV even though it is less secure because we have no database to store a per-upload IV in
$CIPHER = 'AES-128-CBC'
$LOCAL_SUBNETS = ENV['LOCAL_SUBNETS'].split(',').map{|local_subnet| IP::CIDR.new(local_subnet.strip)}

def local_request?(request_ip)
  addr = IP::Address::Util.string_to_ip(request_ip)
  $LOCAL_SUBNETS.any?{|local_subnet| local_subnet.includes?(addr)}
end

get '/' do
  pass unless local_request?(request.ip)
  haml :internal_index
end

get '/' do
  haml :external_index
end

get '/uploads/new' do
  pass unless local_request?(request.ip)
  haml :new_upload
end

post '/uploads' do
  pass unless local_request?(request.ip)
  sender_email = params[:sender_email].downcase
  dest_email = params[:destination_email].downcase

  @upload_key =  Upload.new(dest_email, sender_email, DateTime.now, params[:allow_upload_days].to_i, params[:keep_file_days].to_i, params[:max_file_size].to_i).encode
  send_email(sender_email, :initiation)
  send_email(dest_email, :initiation)

  content_type :json
  {upload_key: @upload_key}.to_json
end

get '/send/:upload_key' do |encoded_key|
  upload = Upload.decode(encoded_key)

  if upload.link_expired?
    haml :link_expired
  elsif upload.link_invalid?
    haml :link_invalid
  else #valid upload link continue to show the upload form

    @keep_days = upload.keep_days
    @sender_email = upload.sender_email
    @dest_email = upload.dest_email
    @max_file_size = upload.max_file_size

    ###
    @folder_name = "nebupload_#{@sender_email}_#{upload.creation_day}_#{upload.creation_time}"
    s3 = AWS::S3.new
    @bucket = s3.buckets[$BUCKET]
    begin
      update_folder_expiration unless bucket_rule_exists?
      haml :send
    rescue => e
      logger.error e
      haml :link_invalid
    end
  end
end

post '/notifications/:folder_name/:sender_email/:dest_email' do
  folder_name = URI.decode(params[:folder_name])
  s3 = AWS::S3.new
  bucket = s3.buckets[$BUCKET]

  @url_array = bucket.objects.with_prefix(folder_name).map do |obj|
    obj_file_name = obj.key.gsub(folder_name + '/', '')
    obj_url = obj.url_for(:get, expires:obj.expiration_date).to_s
    {name: obj_file_name, url: obj_url}
  end

  send_email(URI.decode(params[:sender_email]), :confirmation)
  send_email(URI.decode(params[:dest_email]), :confirmation)
end


def update_folder_expiration
  @bucket.lifecycle_configuration.update({keep_days: @keep_days, folder_name: @folder_name}) do |args|
    add_rule(args[:folder_name] + '/', expiration_time: args[:keep_days ])
  end
end

def bucket_rule_exists?
  @bucket.lifecycle_configuration.rules.select{|rule|rule.prefix == "#{@folder_name}/"}.length > 0
end

def send_email(address, html)
  Pony.mail to: address,
            subject: 'NEB File Uploader: Ready to receive your files',
            from: 'NEB File Upload Service <uploads-admin@neb.com>',
            #via: :smtp,
            # via_options: {
            #     address:               'relay.neb.com',
            #     port:                  '587',
            #     enable_starttls_auto:  true,
            #     openssl_verify_mode:   OpenSSL::SSL::VERIFY_NONE,
            #     #user_name:             ENV['EMAIL_ADDRESS'],
            #     #password:              ENV['EMAIL_PASSWORD'],
            #     #authentication:        :plain, # :plain, :login, :cram_md5, no auth by default
            #     domain:                "uploads.neb.com" # the HELO domain provided by the client to the server
            # },
            html_body: erb(html)
end

