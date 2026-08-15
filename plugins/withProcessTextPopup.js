/**
 * withProcessTextPopup.js
 *
 * Expo config plugin that makes Android's text-selection "Process text"
 * action (Intent.ACTION_PROCESS_TEXT) launch a small, dialog-themed
 * TranslatePopupActivity instead of the normal full-screen MainActivity.
 *
 * This is real native Android code, generated during `npx expo prebuild`.
 * Nothing about PROCESS_TEXT is simulated in JavaScript -- ACTION_PROCESS_TEXT
 * is an OS-level intent that only a native <activity> with the matching
 * <intent-filter> can receive, which is exactly what this plugin adds.
 *
 * What it does, each time `expo prebuild` regenerates the android/ folder:
 *   1. Writes android/app/src/main/java/<package>/TranslatePopupActivity.kt
 *   2. Registers that Activity in AndroidManifest.xml with the
 *      ACTION_PROCESS_TEXT / CATEGORY_DEFAULT / text/plain intent-filter,
 *      themed as a small floating dialog (Theme.Popup, added to styles.xml).
 *   3. MainActivity is left untouched -- it keeps being the normal launcher,
 *      exactly as the spec requires ("the normal MainActivity should
 *      remain the normal application launcher").
 *
 * Because this all happens inside `withDangerousMod`/`withAndroidManifest`,
 * it survives `expo prebuild --clean` -- you never hand-edit the generated
 * android/ folder, so regenerating it doesn't lose this feature. That's the
 * "must remain reproducible" requirement from the spec.
 */

const { withAndroidManifest, withDangerousMod, AndroidConfig } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const ACTIVITY_NAME = '.TranslatePopupActivity';
const THEME_NAME = 'Theme.Popup';

function withProcessTextManifest(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);

    application.activity = application.activity || [];

    // Idempotent: don't duplicate the entry if prebuild runs more than once
    // against a manifest that (for whatever reason) already has it.
    const alreadyPresent = application.activity.some(
      (a) => a.$?.['android:name'] === ACTIVITY_NAME
    );
    if (alreadyPresent) return config;

    application.activity.push({
      $: {
        'android:name': ACTIVITY_NAME,
        'android:theme': `@style/${THEME_NAME}`,
        'android:excludeFromRecents': 'true',
        'android:exported': 'true',
        'android:launchMode': 'singleTask',
      },
      'intent-filter': [
        {
          action: [{ $: { 'android:name': 'android.intent.action.PROCESS_TEXT' } }],
          category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }],
          data: [{ $: { 'android:mimeType': 'text/plain' } }],
        },
      ],
    });

    return config;
  });
}

function withPopupTheme(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const stylesPath = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/res/values/styles.xml'
      );

      let xml = fs.readFileSync(stylesPath, 'utf8');

      const themeBlock =
        `    <style name="${THEME_NAME}" parent="Theme.AppCompat.DayNight.Dialog">\n` +
        `        <item name="android:windowNoTitle">true</item>\n` +
        `        <item name="android:windowIsFloating">true</item>\n` +
        `        <item name="android:backgroundDimEnabled">true</item>\n` +
        `        <item name="android:windowBackground">@android:color/transparent</item>\n` +
        `    </style>\n`;

      if (!xml.includes(`name="${THEME_NAME}"`)) {
        xml = xml.replace('</resources>', `${themeBlock}</resources>`);
        fs.writeFileSync(stylesPath, xml, 'utf8');
      }

      return config;
    },
  ]);
}

function withTranslatePopupActivitySource(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const packageName = config.android?.package;
      if (!packageName) {
        throw new Error(
          'withProcessTextPopup: android.package must be set in app.json before this plugin runs.'
        );
      }

      const packagePath = packageName.split('.').join('/');
      const javaDir = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/java',
        packagePath
      );
      fs.mkdirSync(javaDir, { recursive: true });

      const kotlinSource = `package ${packageName}

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.WindowManager
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import expo.modules.ReactActivityDelegateWrapper

/**
 * Handles Android's text-selection "Process text" action.
 *
 * Registered in AndroidManifest.xml (see withProcessTextPopup.js) with the
 * ACTION_PROCESS_TEXT intent-filter and a small floating dialog theme
 * (Theme.Popup) -- so this genuinely opens as a compact popup, not the
 * full-screen app.
 *
 * It reuses the SAME React Native JS bundle and the SAME registered root
 * component as MainActivity (getMainComponentName() below matches the app
 * name from app.json, exactly like MainActivity's own delegate) -- there is
 * no second app or second translation engine. The only thing this Activity
 * does differently is rewrite its own launch Intent into a
 * "lingovault://popup?text=..." deep link BEFORE calling super.onCreate(),
 * so that Expo Router's built-in linking resolves it to app/popup.tsx
 * automatically, with the selected text as a query param.
 */
class TranslatePopupActivity : ReactActivity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    val selectedText = intent.getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT)?.toString() ?: ""
    val encoded = Uri.encode(selectedText)

    // Mutates the Activity's own held Intent in place -- this is read by
    // Expo Router's linking resolver once super.onCreate() starts the RN
    // instance, exactly as if the OS had launched us via that deep link.
    intent.action = Intent.ACTION_VIEW
    intent.data = Uri.parse("lingovault://popup?text=" + encoded)

    super.onCreate(null)

    // Small floating card near the bottom-ish of the screen rather than a
    // full-screen window -- actual visual "popup" sizing. Theme.Popup
    // (windowIsFloating) makes the window floating; this sets its size.
    window.setLayout(
      (resources.displayMetrics.widthPixels * 0.92).toInt(),
      WindowManager.LayoutParams.WRAP_CONTENT
    )
  }

  override fun getMainComponentName(): String = "main"

  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
      this,
      BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
    )
  }
}
`;

      fs.writeFileSync(path.join(javaDir, 'TranslatePopupActivity.kt'), kotlinSource, 'utf8');
      return config;
    },
  ]);
}

function withProcessTextPopup(config) {
  config = withProcessTextManifest(config);
  config = withPopupTheme(config);
  config = withTranslatePopupActivitySource(config);
  return config;
}

module.exports = withProcessTextPopup;
