#Optcli Grunt tasks

##Available Tasks
* less precompiler
* css autoprefixer
* jshint
* livereload
* custom Optimizely html templating
* custom Optimizely conditional code compiling

##Typical file structure:

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

##Less Precompiler
the less precompiler will look in each experiment folder for a global.less 
file, then will compile that into global.css in the same folder.

##CSS Autoprefixer
The css autoprefixer will grab every global.css file and add browser prefixes
to match the previous 3 versions (back to IE 9). This can be configured in the 
config object. 

##jshint
jshint will lint all JS files that are not included in the 'ignore' property in
the config object. These errors will usually match the ones that optimizely will
point out in the Optimizely UI

##livereload
In order to enable livereload the script must be included on the page in your 
browser. This can be accomplished by pasting the following code into 
tampermonkey/greasemonkey:

var scriptElement = document.createElement('script');
    scriptElement.type = 'text/javascript';
    scriptElement.src =  '//localhost:35729/livereload.js';
    document.head.appendChild(scriptElement);

##Custom Optimizely Html Templating
This task will look for a templates folder in your experiment folder
and will escape any html files and add them to a window.experimentHtml 
object in global.js

##Custom Optimizely Conditional Code Compiling
This task will look for any files labeled conditional.js and insert them
into the experiment.json in the same folder to be uploaded directly into 
optimizely. 