/*
Optcli Grunt tasks

#Available Tasks
* less precompiler
* css autoprefixer
* jshint
* livereload
* custom Optimizely html templating

#Typical file structure:

Project/
  gruntfile.js
  package.json (For gruntfile)
  project.json 
  .optcli/
    token
  experiment/
    experiment.json
    global.js (any templates in this experiment folder will be added here)
    global.less
    global.css
    variation/
      variation.json
      variation.js
    templates/
      template.html (will create window.experimentHtml['template'] in global.js)

#Less Precompiler
the less precompiler will look in each experiment folder for a global.less 
file, then will compile that into global.css in the same folder.

#CSS Autoprefixer
The css autoprefixer will grab every global.css file and add browser prefixes
to match the previous 3 versions (back to IE 9). This can be configured in the 
config object. 

#jshint
jshint will lint all JS files that are not included in the 'ignore' property in
the config object. These errors will usually match the ones that optimizely will
point out in the Optimizely UI

#livereload
In order to enable livereload the script must be included on the page in your 
browser. This can be accomplished by pasting the following code into 
tampermonkey/greasemonkey:

var scriptElement = document.createElement('script');
    scriptElement.type = 'text/javascript';
    scriptElement.src =  '//localhost:35729/livereload.js';
    document.head.appendChild(scriptElement);

#Custom Optimizely Html Templating
This task will look for a templates folder in your experiment folder
and will escape any html files and add them to a window.experimentHtml 
object in global.js

 */


var grunt = require( 'grunt' );
var glob = require( 'glob' );
var fs = require( 'fs' );
var path = require( 'path' );

var livereloadPort = 35729;
var livereloadOptions = {
  port: livereloadPort,
  key: getKey(),
  cert: getCrt()
};

module.exports = function ( grunt ) {
  var lessFiles = {};
  var lessFileGlob = glob.sync( '**/global.less' );
  lessFileGlob.forEach( function ( file, index ) {
    var dirName = path.dirname( file );
    lessFiles[ dirName + '/global.css' ] = dirName + '/global.less';
  } );


  var config = {
    pkg: grunt.file.readJSON( 'package.json' ),
    less: {
      development: {
        files: lessFiles
      },
    },
    autoprefixer: {
      options: {
        browsers: [ 'last 3 versions' ]
      }
    },
    watch: {
      less: {
        files: [ '**/*.less' ],
        tasks: [ 'less', 'autoprefixer' ],
        options: {
          livereload: livereloadOptions
        }
      },
      html: {
        files: [ '**/templates/*.html' ],
        tasks: [ 'compileTemplate' ],
        options: {
          livereload: livereloadOptions
        }
      },
      scripts: {
        files: [ '**/*.js' ],
        options: {
          livereload: livereloadOptions
        }
      }
    },
    jshint: {
      options: {
        reporter: require( 'jshint-stylish' ),
        ignores: [ 'node_modules/**' ]
      },
      all: [ '**/*.js' ]
    }
  };


  for ( var file in lessFiles ) {
    config.autoprefixer[ file ] = {
      src: file,
      dest: file
    };
  }

  grunt.initConfig( config );


  grunt.loadNpmTasks( 'grunt-contrib-less' );
  grunt.loadNpmTasks( 'grunt-contrib-watch' );
  grunt.loadNpmTasks( 'grunt-contrib-jshint' );
  grunt.loadNpmTasks( 'grunt-autoprefixer' );

  // Default tasks.
  grunt.registerTask( 'default', [ 'less', 'autoprefixer', 'compileTemplate', 'watch' ] );


  /**
   * the compileTemplate task will create an object in the global.js
   * for each experiment with a template folder in it. 
   */
  grunt.registerTask( 'compileTemplate', function () {
    //These are the characters which will be replaced
    var entityMap = {
      "&": '&amp;',
      '"': '\\\"',
      "'": '\\\'',
      "\n": '\\n'
    };
    function escapeHtml( string ) {
      return String( string ).replace( /[&"'\n]/g, function ( s ) {
        return entityMap[ s ];
      } );
    }
    // Identify all project JS files with a glob
    var projectArray = glob.sync( '**/global.js' );

    projectArray.forEach( function ( projectJs ) {
      var htmlObjectString = "/* jsInsert:start \n * The experimentHtml object is created using a grunt task\n * on the local machine then uploaded by using the FunnelEnvy\n * Optimizely CLI. Documentation on the Optimizely CLI can be \n * found here: https://github.com/funnelenvy/optimizely-cli\n * The HTML template files can be found in the project git repo\n */\n \nwindow.experimentHtml = {};\n";
      var fileArray = glob.sync( path.dirname( projectJs ) + '/templates/*.html' );

      var globalJsFile = projectJs;
      var globalJs = fs.readFileSync( projectJs, {
        encoding: 'utf8'
      } );

      var templateExists = false;

      fileArray.forEach( function ( file ) {
        templateExists = true;
        var html = escapeHtml( fs.readFileSync( file, {
          encoding: 'utf8'
        } ) );

        var property = {};
        property.name = path.basename( file, '.html' );
        property.string = '\n' + 'window.experimentHtml["' + property.name + '"] = "' + html + '";';

        htmlObjectString += property.string;

      } );
      htmlObjectString += "\n/* jsInsert:end */\n"

      if ( globalJs.match( /\/\*\sjsInsert:start([\s\S]*)jsInsert:end\s\*\// ) && templateExists ) {
        globalJs = globalJs.replace( /\/\*\sjsInsert:start([\s\S]*)jsInsert:end\s\*\//, htmlObjectString );
        fs.writeFileSync( globalJsFile, globalJs );
      } else if ( templateExists ) {
        globalJs += "\n" + htmlObjectString;
        fs.writeFileSync( globalJsFile, globalJs );
      }

    } )

  } );
};

function getCrt(){
  return "-----BEGIN CERTIFICATE-----\nMIIDLjCCAhYCCQCmv5mCRcYMYDANBgkqhkiG9w0BAQUFADBZMQswCQYDVQQGEwJB\nVTETMBEGA1UECBMKU29tZS1TdGF0ZTEhMB8GA1UEChMYSW50ZXJuZXQgV2lkZ2l0\ncyBQdHkgTHRkMRIwEAYDVQQDEwlsb2NhbGhvc3QwHhcNMTQwNzIwMTYwMTI5WhcN\nMTUwNzIwMTYwMTI5WjBZMQswCQYDVQQGEwJBVTETMBEGA1UECBMKU29tZS1TdGF0\nZTEhMB8GA1UEChMYSW50ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMRIwEAYDVQQDEwls\nb2NhbGhvc3QwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCujUxqRCt8\n//cOs+FPwYYDHuAQGHqCHVGR9kC6CYGJezNrHwOUodGUSieKj8S0phoixZeNAGwY\nd1xKRpkE5cB11RQ/uJ/SF0OPlI9/WQaScEcczp9moYSRbqaaEX5lNzR506hIouSL\nv2L83WcMnySPJEwEaXGhh8YeKt4NOffz4Lys/jBVcgS/gUErp0Xj1IAnQKap9wa4\nq3EjyqjtokbsvHQYu5+IPJyyMYq+67Cg4EY+c5vBFVdy9NC2DmAEYTbF6N7DeiB5\nJt2c0A8AbYp1yh/IfJFbaSaMXsCbkuY+E/uXTWmx+Xe90Y1K0UqGinXBsOzkbxdz\nebQ9L8KOMn7TAgMBAAEwDQYJKoZIhvcNAQEFBQADggEBAHQCgQQaHo8JAJMukvnP\nsSecgVVQURtCv13Q9xBl5kIVmFiNutuUswpoJ9oBQeEaVHHGT10uUTGDgYWRFZcO\n0c5+Rkqnxjbp5ZefvBC7ujE+EecDyOtli6cq6IzP6CHUqKj/Okag5m5KMdP/NFS1\nolioehSmJoBxiAUVP5TtFrNFoDtUVj5jwWD1IdRtIVMmo+UcwjDiXU9BAFoboHla\nHLaCSghWYfsAxtkf+4yrBdCk1YxF4Pubnxu4y5nRF5CRJKtTpGhqIfzaDzXoCydd\nC4rX6mmu1UimxqL0FDBnTuUmNIwE7aVXFpL8il911QYMS0ELed8WzO/xC4K4dsZK\n90o=\n-----END CERTIFICATE-----"
}

function getKey(){
  return "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEAro1MakQrfP/3DrPhT8GGAx7gEBh6gh1RkfZAugmBiXszax8D\nlKHRlEonio/EtKYaIsWXjQBsGHdcSkaZBOXAddUUP7if0hdDj5SPf1kGknBHHM6f\nZqGEkW6mmhF+ZTc0edOoSKLki79i/N1nDJ8kjyRMBGlxoYfGHireDTn38+C8rP4w\nVXIEv4FBK6dF49SAJ0CmqfcGuKtxI8qo7aJG7Lx0GLufiDycsjGKvuuwoOBGPnOb\nwRVXcvTQtg5gBGE2xejew3ogeSbdnNAPAG2KdcofyHyRW2kmjF7Am5LmPhP7l01p\nsfl3vdGNStFKhop1wbDs5G8Xc3m0PS/CjjJ+0wIDAQABAoIBAQCOjcFRrDjkDluj\n+05Qh5k95TJSkttCdlVO4pE8HlVXhXGZ06tl8L4r4F/orr+UVW9U5JB/zE97r8eE\ntaF0uXp0AUBXRh3oQ62ejlKfS4Kth9rb8PeHpvOQnpCblRvn560Irc5q+/WxF+3s\n25i0WyhNavRWShNOO4eWzaWpoaUZ2x8C+2uN+uMO4cy56RRHTbF3Z7DBmylFRxvK\n/TapE2PXhEeSeLD9gMNc4iT/5gUaKr5gqUTQWV1Drv59VBl7Z3k+OozesySDOGal\nbQw+1fLurkgdZ7VOTGOdUDbiJTDEt7EHuxyWNp9U/JmA72Ukj/TvCUBcIb0e76oG\n+h/AaFJhAoGBAOiCxSYSpx85diuiCG0ZvGpBnC9YkpBmjVxh2WzfJq7oZ6snlfDg\nb6tDsCBNBddY9gL7fvVdvPMkuAq+XxYdqReRDQMnoehwOmRMoHt7I5TesQHCClUM\noN5jadwPlCNBeCjjYVP9EFmPMRaaIxCXtCFvt1dcGat4NGUBqp+DafOjAoGBAMAv\nllbdBdPe5ciQ+Q7TaVcPXlZMrnv9xb5iyOHWoufV/jUk3BCmANqA8kG1PgS1pufz\ny0jNFjdZnWmtnM2mrhMUB4Q6JHQ2dBO7n3J69iSwqr2+vZB0cfCTRhQLhhA1ZRoh\nRmj44q6ilgFzo/nZxIZTj9+TgZsZrpj/W+AVHnsRAoGAGwJd3n9aNJFbPdRTwEC2\nF23Js+JJHEcdcrbXKAOAHd9Xc5VkoJehwTZatlXcMNjfsxb994jNEz2Xt3/H0eze\nIKOz7ELlVvf6gH46Qj3as0dvLnIY+yo9YbgQqwSQQ8wuJinLu5LxHEY7AJIlMp88\nyImOtbI4NSgAhh88b803OJsCgYBeZMElpude2eLosPPzKTlbDmxaXM1yjwFZ8nES\nI3beAcga2CDSeIaAy8axKVDtxT7WPHMDLeAUjYp4RlJ228AyFKtgcaJIBhrbOlMl\nSmmtOayTB6VZ1yfDbsKDw+kz+tXOkLthgaTs+2RMED1g0WnqRA6tVGjbAjE0am/4\nzsaq0QKBgBufC7E+5mo68GT0dUoHZ54P3y9F0s+t/IPQlCmRWNzYOKuLB5RTPjZF\nZQ2E3ytJuREA6iiC8JpN0zKO+WhbmwtGIn5rrcuUE0TdNHPf85ra62xyEnI3Q77J\ndg1awjfVnHGyyHRwV97T1/MWf8n5kBgqF1F1CJGc0xj7wH07jtAP\n-----END RSA PRIVATE KEY-----"
}
