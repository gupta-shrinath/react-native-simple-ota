import {
  getBundleVersion,
  type OtaUpdate,
  type OtaUpdateProvider,
} from 'react-native-simple-ota';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { version } from './package.json';

export default class MyOtaUpdateProvider implements OtaUpdateProvider {
  isUserApplicableForUpdate(): boolean {
    return true;
  }

  async getOtaUpdate(): Promise<OtaUpdate | null> {
    try {
      const bundleInfo: BundleInfo | null = await this.getUpdate();
      if (bundleInfo == null) {
        return null;
      }
      const currentBundleVersion = getBundleVersion();
      if (
        currentBundleVersion != null &&
        currentBundleVersion >= bundleInfo.bundle_version
      ) {
        return null;
      }
      let bundlePath = '';
      if (Platform.OS === 'android') {
        bundlePath = FileSystem.documentDirectory + 'index.bundle';
      } else if (Platform.OS === 'ios') {
        bundlePath = FileSystem.documentDirectory + 'main.jsbundle';
      }
      console.log('ReactNativeSimpleOta Download Start');
      const file = FileSystem.createDownloadResumable(
        bundleInfo.bundle_url,
        bundlePath,
      );
      console.log(
        'ReactNativeSimpleOtaExample OTA Download complete',
        (await file.downloadAsync())?.status
      );
      const update: OtaUpdate = {
        bundleVersion: bundleInfo.bundle_version,
        bundlePath: bundlePath.replace("file://",""),
      };
      return update;
    } catch (e: any) {
      console.log('ReactNativeSimpleOtaExample OTA download failed', e);
    }
    return null;
  }

  async getUpdate(): Promise<BundleInfo | null> {
    try {
      const response = await fetch('http://192.168.0.118:8080/expo-ota.json');
      if (!response.ok) throw new Error('Failed to fetch OTA config');

      const updates: OTAConfig = await response.json();

      if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
        return null; // unsupported platform
      }

      const platformUpdates = updates[Platform.OS as 'android' | 'ios'];
      return platformUpdates?.[version]?.[0] ?? null;
    } catch (error) {
      console.error('Error fetching OTA update:', error);
      return null;
    }
  }
}

interface OTAConfig {
  android: PlatformBundles;
  ios: PlatformBundles;
}

interface PlatformBundles {
  [appVersion: string]: BundleInfo[];
}

interface BundleInfo {
  bundle_version: string;
  bundle_url: string;
  bundle_hash: string;
}
