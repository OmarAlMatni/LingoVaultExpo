// metro.config.js
//
// The dictionary ships as a prebuilt, read-only SQLite file
// (assets/dictionary.db) that we load via expo-sqlite's
// `assetSource={{ assetId: require('./assets/dictionary.db') }}` API.
//
// Metro only treats `.db` as a loadable asset (rather than trying to parse
// it as a JS module) once it's registered in assetExts. This one line is
// the entire fix for what used to be a WebView/asset-path nightmare in the
// old Capacitor build.

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('db');

module.exports = config;
