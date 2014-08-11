# config valid only for Capistrano 3.1
lock '3.2.1'

set :application, 'file_uploader'
set :repo_url, 'https://github.com/nebiolabs/large_file_uploader.git'
set :deploy_to, '/var/www/large_file_uploader'

set :linked_files, ['.env']
set :keep_releases, 5
set :branch, :master
set :log_level, :info
set :rbenv_ruby, '2.1.2'

set :linked_dirs, ['log', 'tmp']

namespace :deploy do

  desc 'Restart application'
  task :restart do
    on roles(:app), in: :sequence, wait: 5 do
      execute :touch, release_path.join('tmp/restart.txt')
    end
  end

  after :publishing, :restart

end

desc "Report Uptimes"
task :uptime do
  on roles(:all) do |host|
    info "Host #{host} (#{host.roles.to_a.join(', ')}):\t#{capture(:uptime)}"
  end
end