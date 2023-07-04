//
//  AddTarget.js
//  This hook runs for the iOS platform when the plugin or platform is added.
//

const PLUGIN_ID = '@kaleyra/video-cordova-broadcast-extension-plugin';
const BUNDLE_SUFFIX = '.UploadExtension';

var fs = require('fs');
var path = require('path');
var packageJson;
var bundleIdentifier;

function redError(message) {
    return new Error('"' + PLUGIN_ID + '" \x1b[1m\x1b[31m' + message + '\x1b[0m');
}

function replacePreferencesInFile(filePath, preferences) {
    var content = fs.readFileSync(filePath, 'utf8');
    for (var i = 0; i < preferences.length; i++) {
        var pref = preferences[i];
        var regexp = new RegExp(pref.key, "g");
        content = content.replace(regexp, pref.value);
    }
    fs.writeFileSync(filePath, content);
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

function getPreferenceValue(configXml, name) {
  var value = configXml.match(new RegExp('name="' + name + '" value="(.*?)"', "i"));
  if (value && value[1]) {
    return value[1];
  } else {
    return null;
  }
}

function getCordovaParameter(configXml, variableName) {
  var variable = packageJson.cordova.plugins[PLUGIN_ID][variableName];
  if (!variable) {
    variable = getPreferenceValue(configXml, variableName);
  }
  return variable;
}

// Get the bundle id from config.xml
function getBundleId(context, configXml) {
  var elementTree = require('elementtree');
  var etree = elementTree.parse(configXml);
  return etree.getroot().get('id');
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
  var shareExtensionFolder = path.join(iosFolder(context), 'UploadExtension');
  if (!fs.existsSync(shareExtensionFolder)) {
    console.error('!!  Upload extension files have not been copied yet!!');
    return;
  }
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

function projectPlistPath(context, projectName) {
  return path.join(iosFolder(context), projectName, projectName + '-Info.plist');
}

function projectPlistJson(context, projectName) {
  var plist = require('plist');
  var path = projectPlistPath(context, projectName);
  return plist.parse(fs.readFileSync(path, 'utf8'));
}

function getPreferences(context, configXml, projectName) {
  var plist = projectPlistJson(context, projectName);
  var group = "group." + bundleIdentifier;
  if (getCordovaParameter(configXml, 'IOS_APP_GROUP_IDENTIFIER')) {
    group = getCordovaParameter(configXml, 'IOS_APP_GROUP_IDENTIFIER');
  }
  var displayName = projectName;
  if (getCordovaParameter(configXml, 'IOS_EXTENSION_DISPLAY_NAME')) {
    displayName = getCordovaParameter(configXml, 'IOS_EXTENSION_DISPLAY_NAME');
  }

  var extensionBundleId = bundleIdentifier + BUNDLE_SUFFIX;
  if (getCordovaParameter(configXml, 'IOS_EXTENSION_BUNDLE_ID')) {
    extensionBundleId = getCordovaParameter(configXml, 'IOS_EXTENSION_BUNDLE_ID');
  }

  return [{
    key: '__DISPLAY_NAME__',
    value: displayName
  }, {
    key: '__BUNDLE_IDENTIFIER__',
    value: extensionBundleId
  } ,{
      key: '__GROUP_IDENTIFIER__',
      value: group
  }, {
    key: '__BUNDLE_SHORT_VERSION_STRING__',
    value: plist.CFBundleShortVersionString
  }, {
    key: '__BUNDLE_VERSION__',
    value: plist.CFBundleVersion
  }];
}

// Return the list of files in the share extension project, organized by type
function getExtensionFiles(context) {
  var files = {source:[],plist:[],resource:[], entitlements:[]};
  var FILE_TYPES = { '.h':'source', '.m':'source', '.plist':'plist', '.entitlements' : 'entitlements'};
  forEachExtensionFile(context, function(file) {
    var fileType = FILE_TYPES[file.extension] || 'resource';
    files[fileType].push(file);
  });
  return files;
}

function updatePodfile(context) {
  var template = "target '__TARGET_NAME__' do\n" +
      "  use_frameworks!\n" +
      "  platform :ios, '12.0'\n" +
      "\n" +
      "  pod 'BandyerBroadcastExtension'\n" +
      "end\n";

  var podfilePath = path.join(iosFolder(context), "Podfile");
  var content = fs.readFileSync(podfilePath, 'utf8');
  var regexp = new RegExp("__TARGET_NAME__", "g");
  content = content + "\n";
  content = content + template.replace(regexp, "UploadExtension");
  fs.writeFileSync(podfilePath, content);
  const spawn = require('child_process').spawnSync;
  var projectDirectoryArg = "--project-directory=" + iosFolder(context);
  const pod = spawn('pod', ['install', projectDirectoryArg,'--verbose']);
  console.log(`stderr: ${pod.stderr.toString()}`);
  console.log(`stdout: ${pod.stdout.toString()}`);
}

console.log('Adding target "' + PLUGIN_ID + '/UploadExtension" to XCode project');

module.exports = function (context) {
  var Q = require('q');
  var deferral = new Q.defer();

  packageJson = require(path.join(context.opts.projectRoot, 'package.json'));

  if (context.opts.platforms.indexOf('ios') < 0) {
    console.error("You must add the ios platform before adding this plugin!");
    deferral.resolve();
    return deferral.promise;
  }

  var configXml = fs.readFileSync(path.join(context.opts.projectRoot, 'config.xml'), 'utf-8');
  if (configXml) {
    configXml = configXml.substring(configXml.indexOf('<'));
  }

  bundleIdentifier = getBundleId(context, configXml);

  findXCodeproject(context, function(projectFolder, projectName) {
    console.log('  - Folder containing your iOS project: ' + iosFolder(context));

    var pbxProjectPath = path.join(projectFolder, 'project.pbxproj');
    var pbxProject = parsePbxProject(context, pbxProjectPath);

    var files = getExtensionFiles(context);

    var preferences = getPreferences(context, configXml, projectName);
    files.plist.concat(files.source).concat(files.entitlements).forEach(function(file) {
      replacePreferencesInFile(file.path, preferences);
    });

    // Find if the project already contains the target and group
    var target = pbxProject.pbxTargetByName('UploadExtension') || pbxProject.pbxTargetByName('"UploadExtension"');
    if (target) {
      console.log('    UploadExtension target already exists.');
    }

    if (!target) {
      // Add PBXNativeTarget to the project
      target = pbxProject.addTarget('UploadExtension', 'app_extension', 'UploadExtension');

      // Add a new PBXSourcesBuildPhase for our ShareViewController
      // (we can't add it to the existing one because an extension is kind of an extra app)
      pbxProject.addBuildPhase([], 'PBXSourcesBuildPhase', 'Sources', target.uuid);

      // Add a new PBXResourcesBuildPhase for the Resources used by the Share Extension
      // (MainInterface.storyboard)
      pbxProject.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', target.uuid);
    }

    // Create a separate PBXGroup for the shareExtensions files, name has to be unique and path must be in quotation marks
    var pbxGroupKey = pbxProject.findPBXGroupKey({name: 'UploadExtension'});
    if (pbxGroupKey) {
      console.log('    UploadExtension group already exists.');
    }
    if (!pbxGroupKey) {
      pbxGroupKey = pbxProject.pbxCreateGroup('UploadExtension', 'UploadExtension');

      // Add the PbxGroup to cordovas "CustomTemplate"-group
      var customTemplateKey = pbxProject.findPBXGroupKey({name: 'CustomTemplate'});
      pbxProject.addToPbxGroup(pbxGroupKey, customTemplateKey);
    }

    // Add files which are not part of any build phase (config)
    files.plist.forEach(function (file) {
      pbxProject.addFile(file.name, pbxGroupKey);
    });

    files.entitlements.forEach(function (file) {
      pbxProject.addFile(file.name, pbxGroupKey);
    });

    // Add source files to our PbxGroup and our newly created PBXSourcesBuildPhase
    files.source.forEach(function(file) {
      pbxProject.addSourceFile(file.name, {target: target.uuid}, pbxGroupKey);
    });

    //  Add the resource file and include it into the target PbxResourcesBuildPhase and PbxGroup
    files.resource.forEach(function(file) {
      pbxProject.addResourceFile(file.name, {target: target.uuid}, pbxGroupKey);
    });

    var configurations = pbxProject.pbxXCBuildConfigurationSection();
    for (var key in configurations) {
      if (typeof configurations[key].buildSettings !== 'undefined') {
        var buildSettingsObj = configurations[key].buildSettings;
        if (typeof buildSettingsObj['PRODUCT_NAME'] !== 'undefined') {
          var productName = buildSettingsObj['PRODUCT_NAME'];
          if (productName.indexOf('UploadExtension') >= 0) {
            buildSettingsObj['CODE_SIGN_ENTITLEMENTS'] = '"UploadExtension/UploadExtension.entitlements"';
            buildSettingsObj['IPHONEOS_DEPLOYMENT_TARGET'] = '12.0';
          }
        }
      }
    }

    //Add development team and provisioning profile
    var PROVISIONING_PROFILE = getCordovaParameter(configXml, 'SHAREEXT_PROVISIONING_PROFILE');
    var DEVELOPMENT_TEAM = getCordovaParameter(configXml, 'SHAREEXT_DEVELOPMENT_TEAM');
    console.log('Adding team', DEVELOPMENT_TEAM, 'and provisioning profile', PROVISIONING_PROFILE);
    if (PROVISIONING_PROFILE && DEVELOPMENT_TEAM) {
      var configurations = pbxProject.pbxXCBuildConfigurationSection();
      for (var key in configurations) {
        if (typeof configurations[key].buildSettings !== 'undefined') {
          var buildSettingsObj = configurations[key].buildSettings;
          if (typeof buildSettingsObj['PRODUCT_NAME'] !== 'undefined') {
            var productName = buildSettingsObj['PRODUCT_NAME'];
            if (productName.indexOf('UploadExtension') >= 0) {
              buildSettingsObj['PROVISIONING_PROFILE'] = PROVISIONING_PROFILE;
              buildSettingsObj['DEVELOPMENT_TEAM'] = DEVELOPMENT_TEAM;
              buildSettingsObj['CODE_SIGN_STYLE'] = 'Manual';
              buildSettingsObj['CODE_SIGN_IDENTITY'] = '"iPhone Distribution"';
              console.log('Added signing identities for extension!');
            }
          }
        }
      }
    }

    // Write the modified project back to disc
    // console.log('    Writing the modified project back to disk...');
    fs.writeFileSync(pbxProjectPath, pbxProject.writeSync());
    console.log('Added UploadExtension to XCode project');

    updatePodfile(context);
    deferral.resolve();
  });

  return deferral.promise;
};