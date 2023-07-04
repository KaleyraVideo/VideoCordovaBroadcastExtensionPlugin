![Kaleyra Logo](doc/img/kaleyra-video.png)

# Kaleyra Video Broadcast Extension Cordova Plugin 

This plugin enables your app to take advantage of the Broadcast screen sharing feature of the Kaleyra Video iOS SDK. In order for your user to share the device screen during a video call on iOS, your app needs to provide a BroadcastUploadExtension, a small app extension that runs a standalone process that records the user device screen and stream it to the other participants participating in the video call. This plugin aims to make it easy for you to add this app extension to your app with a one liner commmand.

## Requirements

- **iOS** version 12.0 or higher (if your app must support older versions of the operating system, don't worry, you will be still be able to build and ship your app without any chore)
- **Cordova** version 9.0 or higher
- **Cordova iOS** version 6.0 or higher
- **@kaleyra/video-cordova-plugin** version 1.0.0 or higher

## How it works

This plugin provides a Broadcast Upload App Extension using the **Kaleyra Video broadcast extension** native framework, it adds this extension to your app as a new target ensuring the mandatory configuration settings are setup properly and that your app entitlements are also setup properly. 

You are required to perform the following installation steps only the first time you install the plugin, then you can almost forget about it. There's a caveat though, if you are already using the **@kaleyra/video-cordova-plugin** in your app, you are required to uninstall it and reinstall it following the steps you are going to find next, but then again you do it once and you're done.

## Installation

As we mentioned earlier if you are already using the **@kaleyra/video-cordova-plugin** in your app, you are required to uninstall it, then you can follow the installation steps as you were installing the Kaleyra Video plugin for the first time.

### Kaleyra Video Cordova Plugin

The Kaleyra Video cordova plugin must be installed providing some configuration settings in order to enable the support for the Broadcast extension. 
From your terminal, browse to your app directory than launch the following command replacing the variables values with your own values:

Please do not run this command unless you read the following chapter already.

```sh
cordova plugin add @kaleyra/video-cordova-plugin \
 --variable IOS_APP_GROUP_IDENTIFIER="YOUR APP GROUP IDENTIFIER" \
 --variable IOS_EXTENSION_BUNDLE_ID="YOUR EXTENSION BUNDLE ID"
``` 

#### App group identifier

You must provide the `IOS_APP_GROUP_IDENTIFIER` variable with an application security group identifier. If you are already using a security app group in your app you can provide its identifier replacing "YOUR APP GROUP IDENTIFIER" with it (without quotation marks). If you are not using any application security group in your app, or if you don't know what it is then bear a second with me.
An application security group identifier represents a group of apps that can access shared containers and communicate using interprocess communication. 
The app group identifier has the following shape `group.<group name>` where the "group." part is required (you cannot create an identifier that does not start with `group.`), whereas the `<group name>` part is also required but you can use whatever name you like as long as it does not contain any invalid characters (such as whitespaces). The convention is to use `group.` and then concatenate the DNS reverse format of your app (namely your app bundle identifier). For example, let's pretend your app has the following bundle identifier `com.acme.MyWonderfulApp`, then the app group identifier for that app would be `group.com.acme.MyWonderfulApp`.
If you don't have an app group already make it up one of your own, following the suggestion just provided, then provide the identifier to the command above. You are going to need to register the app group in your Apple developer account and recreate your provisioning profiles, but if you rely on Xcode it'll do it for you.

#### Extension bundle id

This value represents the bundle identifier of the Broadcast Upload Extension this plugin is going to create and add to your app. 
App extension bundle identifiers must have a prefix consisting of their containing application's bundle identifier followed by a '.' plus whatever name you want. For example, if your app bundle identifier is `com.acme.MyWonderfulApp` then your extension bundle identifier must be `com.acme.MyWonderfulApp.ExtensionNameOrWhatever`.
Make an extension bundle id of your own than provide that id to the command above.

#### Example

Now, let's pretend your app group identifier was `group.com.acme.MyWonderfulApp` and your app extension bundle identifier was `com.acme.MyWonderfulApp.ExtensionNameOrWhatever` then the command you'd submit in the terminal will be:

```sh
cordova plugin add @kaleyra/video-cordova-plugin \
 --variable IOS_APP_GROUP_IDENTIFIER=group.com.acme.MyWonderfulApp \
 --variable IOS_EXTENSION_BUNDLE_ID=com.acme.MyWonderfulApp.ExtensionNameOrWhatever
```

Take note of the identifiers used because you are going to be using them again when installing the "Kaleyra Video Broadcast Extension Cordova Plugin".

### Kaleyra Video Broadcast Extension Cordova Plugin

We are almost there I promise. Finally, you must add the "Kaleyra Video Broadcast Extension Cordova Plugin" to your app. 
In terminal, type the following command:

Again, please do not run this command unless you read the following chapter already.

```sh
cordova plugin add @kaleyra/video-cordova-broadcast-extension-plugin \
	--variable IOS_APP_GROUP_IDENTIFIER="YOUR APP GROUP IDENTIFIER" \
	--variable IOS_EXTENSION_BUNDLE_ID="YOUR EXTENSION BUNDLE ID" \
	--variable IOS_EXTENSION_DISPLAY_NAME="YOUR EXTENSION DISPLAY NAME"
``` 

As before, you should replace `"YOUR APP GROUP IDENTIFIER"` and `"YOUR EXTENSION BUNDLE ID"` with your app group identifier and the extension bundle id respectively with the values you used in the previous command. You should also replace `"YOUR EXTENSION DISPLAY NAME"` with the display name your users will see when they are going to be prompted to choose what broadcast extension they want to use. We strongly suggest you to use your app display name.

#### Example

Following the previous example, the command you would submit to the terminal will be:

```sh
cordova plugin add @kaleyra/video-cordova-broadcast-extension-plugin \
	--variable IOS_APP_GROUP_IDENTIFIER=group.com.acme.MyWonderfulApp \
	--variable IOS_EXTENSION_BUNDLE_ID=com.acme.MyWonderfulApp.ExtensionNameOrWhatever \
	--variable IOS_EXTENSION_DISPLAY_NAME=MyApp
```

### Platform add

At this point the plugin is not embedded in your app yet. The broadcast extension target will be added with a Cordova hook when the `cordova prepare` command is executed.

The last two steps you must perform is as usual update your npm modules and prepare the iOS platform.
From the terminal, in your app folder, run the following command:

```sh
npm i && cordova platform rm ios --nosave && cordova platform add ios --nosave
```

## Kaleyra Video plugin configuration

Once you have installed and configured the plugins, the last thing you need to do in order to enable the broadcast screen sharing in your app is to tell the Kaleyra Video Plugin you want to enable that feature. From Javascript, in the snippet of code where you configure KaleyraVideo you must add the `broadcastScreenSharingEnabled` flag to the `iosConfig` object with a value of `true`. Here's the gist:

```javascript
var kaleyraVideo = KaleyraVideo.configure({
        environment: KaleyraVideo.environments.sandbox(),
        appId: 'mAppId_xxx', // your mobile appId
        iosConfig: {
            callkit: {
                enabled: true, 
                appIconName: "logo_transparent", 
                ringtoneSoundName: "custom_ringtone.mp3" 
            },
            fakeCapturerFileName: null, 
            voipNotificationKeyPath: 'keypath_to_kaleyra_data', 
            broadcastScreenSharingEnabled: true // Add this flag to enable the broadcast screen sharing feature 
        }
})
```

Beware, if the plugin is not configured properly, that flag has no effect whatsoever. 

## Variables

Both "Kaleyra Video Cordova Plugin" and the "Kaleyra Video Broadcast Extension Cordova Plugin" have their own preferences you can customise to your need.

### Kaleyra Video Cordova Plugin

Below you'll find a table containing the settings you can customize both from the CLI and from the config.xml file of your app for the "Kaleyra Video Cordova Plugin". If you don't provide any preference both from the CLI and from the config.xml file, some default values will be used instead.


| variable                    | example                        | default  | notes                                                                                            |
|-----------------------------|--------------------------------|----------|----------------------------------------------------------------------------------------|
| `IOS_APP_GROUP_IDENTIFIER` | group.com.acme.MyApp            | ""       | **iOS only** Represents the security app group identifier shared by the app and the upload extension. It's a mandatory argument, if you don't provide a value, a default empty value will be used but the broadcast tool will be disabled  |
| `IOS_EXTENSION_BUNDLE_ID`  | com.acme.MyApp.UploadExtension | ""        | **iOS only** Represents the broadcast upload extension bundle identifier. It's a mandatory argument, if you don't provide any value a default empty value will be used but the broadcast tool will be disabled |

#### Example

From the CLI:

```sh
cordova plugin add @kaleyra/video-cordova-plugin \
 --variable IOS_APP_GROUP_IDENTIFIER=group.com.acme.MyApp \
 --variable IOS_EXTENSION_BUNDLE_ID=com.acme.MyApp.UploadExtension
```

In the config.xml:

```xml
<plugin name="@kaleyra/video-cordova-plugin">
  <variable name="IOS_APP_GROUP_IDENTIFIER" value="group.com.acme.MyApp" />
  <variable name="IOS_EXTENSION_BUNDLE_ID" value="com.acme.MyApp.UploadExtension" />
</plugin>

```

### Kaleyra Video Broadcast Extension Cordova Plugin

Below you'll find a table containing the settings you can customize both from the CLI and from the config.xml file of your app for the "Kaleyra Video Broadcast Extension Cordova Plugin". You are **required** to provide these values otherwise the plugin is not going to work.


| variable                    | example                        | mandatory  | notes                                                                                            |
|-----------------------------|--------------------------------|----------|----------------------------------------------------------------------------------------|
| `IOS_APP_GROUP_IDENTIFIER` | group.com.acme.MyApp            | true       | **iOS only** Represents the security app group identifier shared by the app and the upload extension. It's a mandatory argument, if you don't provide a value, a default empty value will be used but the broadcast tool will be disabled  |
| `IOS_EXTENSION_BUNDLE_ID`  | com.acme.MyApp.UploadExtension | true        | **iOS only** Represents the broadcast upload extension bundle identifier. It's a mandatory argument, if you don't provide any value a default empty value will be used but the broadcast tool will be disabled |
| `IOS_EXTENSION_DISPLAY_NAME `  | MyApp | true        | **iOS only** Represents the broadcast upload extension display name. This name will be diplayed to the user when one chooses to screen share her/his device screen |

#### Example

From the CLI:

```sh
cordova plugin add @kaleyra/video-cordova-broadcast-extension-plugin \
 --variable IOS_APP_GROUP_IDENTIFIER=group.com.acme.MyApp \
 --variable IOS_EXTENSION_BUNDLE_ID=com.acme.MyApp.UploadExtension \
 --variable IOS_EXTENSION_DISPLAY_NAME=MyApp
```

In the config.xml:

```xml
<plugin name="@kaleyra/video-cordova-broadcast-extension-plugin">
  <variable name="IOS_APP_GROUP_IDENTIFIER" value="group.com.acme.MyApp" />
  <variable name="IOS_EXTENSION_BUNDLE_ID" value="com.acme.MyApp.UploadExtension" />
  <variable name="IOS_EXTENSION_DISPLAY_NAME" value="MyApp" />
</plugin>

```

## Credits

The plugin hooks are a modified version of the hooks taken from the [cordova-plugin-openwith](https://github.com/j3k0/cordova-plugin-openwith)
