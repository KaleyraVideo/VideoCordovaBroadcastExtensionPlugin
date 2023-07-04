//
//  RemoveTarget.js
//  This hook runs for the iOS platform when the plugin or platform is removed.
//

const PLUGIN_ID = "@kaleyra/video-cordova-broadcast-extension-plugin";
const EXTENSION_NAME = "UploadExtension";

var fs = require('fs');
var path = require('path');

function redError(message) {
    return new Error('"' + PLUGIN_ID + '" \x1b[1m\x1b[31m' + message + '\x1b[0m');
}

// Determine the full path to the app's xcode project file.
function findXCodeproject(context, callback) {
  fs.readdir(iosFolder(context), function(err, data) {
    var projectFolder;
    var projectName;
    // Find the project folder by looking for *.xcodeproj
    if (data && data.length) {
      data.forEach(function(folder) {
        if (folder.match(/\.xcodeproj$/)) {
          projectFolder = path.join(iosFolder(context), folder);
          projectName = path.basename(folder, '.xcodeproj');
        }
      });
    }

    if (!projectFolder || !projectName) {
      throw redError('Could not find an .xcodeproj folder in: ' + iosFolder(context));
    }

    if (err) {
      throw redError(err);
    }

    callback(projectFolder, projectName);
  });
}

// Determine the full path to the ios platform
function iosFolder(context) {
  return context.opts.cordova.project
    ? context.opts.cordova.project.root
    : path.join(context.opts.projectRoot, 'platforms/ios/');
}

function parsePbxProject(context, pbxProjectPath) {
  var xcode = require('xcode');
  console.log('    Parsing existing project at location: ' + pbxProjectPath + '...');
  var pbxProject;
  if (context.opts.cordova.project) {
    pbxProject = context.opts.cordova.project.parseProjectFile(context.opts.projectRoot).xcode;
  } else {
    pbxProject = xcode.project(pbxProjectPath);
    pbxProject.parseSync();
  }
  return pbxProject;
}

function forEachExtensionFile(context, callback) {
  var shareExtensionFolder = path.join(iosFolder(context), EXTENSION_NAME);
  fs.readdirSync(shareExtensionFolder).forEach(function(name) {
    // Ignore junk files like .DS_Store
    if (!/^\..*/.test(name)) {
      callback({
        name:name,
        path:path.join(shareExtensionFolder, name),
        extension:path.extname(name)
      });
    }
  });
}

// Return the list of files in the share extension project, organized by type
function getExtensionFiles(context) {
  var files = {source:[],plist:[],resource:[], entitlements: []};
  var FILE_TYPES = { '.h':'source', '.m':'source', '.plist':'plist', '.entitlements': 'entitlements' };
  forEachExtensionFile(context, function(file) {
    var fileType = FILE_TYPES[file.extension] || 'resource';
    files[fileType].push(file);
  });
  return files;
}

console.log('Removing target "' + PLUGIN_ID + '/' + EXTENSION_NAME + ' to XCode project');

module.exports = function (context) {
  var Q = require('q');
  var deferral = new Q.defer();

  if (context.opts.platforms.indexOf('ios') < 0) {
    console.log("ios platform not found! skipping hook");
    deferral.resolve();
    return deferral.promise;
  }

  findXCodeproject(context, function(projectFolder, projectName) {

    console.log('  - Folder containing your iOS project: ' + iosFolder(context));

    var pbxProjectPath = path.join(projectFolder, 'project.pbxproj');
    var pbxProject = parsePbxProject(context, pbxProjectPath);
    var files = getExtensionFiles(context);

    // Find if the project already contains the target and group
    var target = pbxProject.pbxTargetByName(EXTENSION_NAME);
    var pbxGroupKey = pbxProject.findPBXGroupKey({name: EXTENSION_NAME});

    // Remove the PbxGroup from cordovas "CustomTemplate"-group
    if (pbxGroupKey) {
      var customTemplateKey = pbxProject.findPBXGroupKey({name: 'CustomTemplate'});
      pbxProject.removeFromPbxGroup(pbxGroupKey, customTemplateKey);

      // Remove files which are not part of any build phase (config)
      files.plist.forEach(function (file) {
        pbxProject.removeFile(file.name, pbxGroupKey);
      });

      files.entitlements.forEach(function (file) {
        pbxProject.removeFile(file.name, pbxGroupKey);
      });

      // Remove source files to our PbxGroup and our newly created PBXSourcesBuildPhase
      files.source.forEach(function(file) {
        pbxProject.removeSourceFile(file.name, {target: target.uuid}, pbxGroupKey);
      });

      //  Remove the resource file and include it into the targest PbxResourcesBuildPhase and PbxGroup
      files.resource.forEach(function(file) {
        pbxProject.removeResourceFile(file.name, {target: target.uuid}, pbxGroupKey);
      });
    }

    fs.writeFileSync(pbxProjectPath, pbxProject.writeSync());
    console.log('Removed ' + EXTENSION_NAME + ' from XCode project');

    deferral.resolve();
  });

  return deferral.promise;
};