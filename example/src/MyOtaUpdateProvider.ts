import {
  getBundleVersion,
  type OtaUpdate,
  type OtaUpdateProvider,
} from 'react-native-simple-ota';
import RNFS from 'react-native-fs';
import { Platform } from 'react-native';
import { version } from '../package.json';

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
        bundlePath = RNFS.DocumentDirectoryPath + '/index.bundle';
      } else if (Platform.OS === 'ios') {
        bundlePath = RNFS.DocumentDirectoryPath + '/main.jsbundle';
      }
      console.log('ReactNativeSimpleOta Download Start');
      const file = RNFS.downloadFile({
        connectionTimeout: 40000,
        readTimeout: 40000,
        backgroundTimeout: 40000,
        fromUrl: bundleInfo.bundle_url,
        toFile: bundlePath,
      });
      console.log(
        'ReactNativeSimpleOtaExample OTA Download complete',
        (await file.promise).statusCode
      );
      const update: OtaUpdate = {
        bundleVersion: bundleInfo.bundle_version,
        bundlePath: bundlePath,
      };
      return update;
    } catch (e: any) {
      console.log('ReactNativeSimpleOtaExample OTA download failed', e);
    }
    return null;
  }

  async getUpdate(): Promise<BundleInfo | null> {
    try {
      const response = await fetch('http://192.168.0.102:8080/ota.json');
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
