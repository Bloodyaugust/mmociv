module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    compass: {
      dev: {
        options: {
          config: 'styles/config.rb',
          basePath: 'styles/'
        }
      }
    },
    watch: {
      files: ['app/*.js', 'app/*/*.js', 'templates/*', 'styles/*', 'styles/sass/*', 'index.html'],
      tasks: ['compass'],
      options: {
        livereload: 1337
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-compass');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('default', ['compass']);
};
