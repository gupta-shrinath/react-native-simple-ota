import {
  getCurrentBundlePath,
  getBundleVersion,
  patch,
  type OtaUpdate,
  type OtaUpdateProvider,
} from 'react-native-simple-ota';
import RNFS from 'react-native-fs';
import { Platform } from 'react-native';
import { version } from '../package.json';
import CryptoJS from 'crypto-js';
import { unzip } from 'react-native-zip-archive';

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
      let compressedBundlePatchPath = RNFS.DocumentDirectoryPath + '/patch.zip';
      console.log('ReactNativeSimpleOta Download Start');
      const file = RNFS.downloadFile({
        connectionTimeout: 40000,
        readTimeout: 40000,
        backgroundTimeout: 40000,
        fromUrl: bundleInfo.patch_url,
        toFile: compressedBundlePatchPath,
      });
      const isFileDownloadSuccess = (await file.promise).statusCode == 200;
      console.log(
        'ReactNativeSimpleOtaExample OTA Download complete',
        isFileDownloadSuccess
      );
      if (!isFileDownloadSuccess) {
        return null;
      }
      const decompressedBundlePatchPath = await this.getDecompressedBundlePatchPath(compressedBundlePatchPath);
      console.log("ReactNativeSimpleOtaExample decompressedBundlePatchPath",decompressedBundlePatchPath)
      if (decompressedBundlePatchPath == null) {
        console.log('ReactNativeSimpleOtaExample Decompressed patch failed');
        return null;
      }
      const patchPath = bundleInfo.patch_url.split("/").at(-1)?.replace(".zip", "");
      console.log("ReactNativeSimpleOtaExample patchPath",patchPath)
      if (patchPath == undefined) {
        console.log('ReactNativeSimpleOtaExample Patch path is undefined');
        return null;
      }
      const currentBundlePath = getCurrentBundlePath();
      console.log("ReactNativeSimpleOtaExample patchPath",patchPath)
      if (currentBundlePath == null) {
        console.log('ReactNativeSimpleOtaExample Current bundle path is null');
        return null;
      }
      let otaBundlePath = '';
      if (Platform.OS === 'android') {
        otaBundlePath = RNFS.DocumentDirectoryPath + '/index.bundle';
      } else if (Platform.OS === 'ios') {
        otaBundlePath = RNFS.DocumentDirectoryPath + '/main.jsbundle';
      }
      console.log('ReactNativeSimpleOtaExample currentBundlePath hash',await this.getBundleHash(currentBundlePath))
      console.log('ReactNativeSimpleOtaExample Patching Start', currentBundlePath, otaBundlePath, decompressedBundlePatchPath + `/${patchPath}`);
      const patchResult = await patch(currentBundlePath, otaBundlePath, decompressedBundlePatchPath + `/${patchPath}`);
      console.log('ReactNativeSimpleOtaExample patchResult',JSON.stringify(patchResult))
      if(!patchResult.isSuccess) {
        return null;
      }
      const fileHash = await this.getBundleHash(otaBundlePath);
      if (fileHash == null) {
        console.log('ReactNativeSimpleOtaExample Compute file hash failed');
        return null;
      }
      if (fileHash != bundleInfo.bundle_hash) {
        console.log('ReactNativeSimpleOtaExample Bundle hash mismatch');
        return null;
      }
      const update: OtaUpdate = {
        bundleVersion: bundleInfo.bundle_version,
        bundlePath: otaBundlePath,
      };
      return update;
    } catch (e: any) {
      console.log('ReactNativeSimpleOtaExample OTA download failed', e);
    }
    return null;
  }

  async getUpdate(): Promise<BundleInfo | null> {
    try {
      const response = await fetch('http://192.168.1.102:8080/ota.json');
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

  async getBundleHash(bundlePath: string) {
    try {
      const fileData = await RNFS.readFile(bundlePath, 'base64');
      const hash = CryptoJS.SHA256(CryptoJS.enc.Base64.parse(fileData)).toString();
      console.log('ReactNativeSimpleOtaExample Hash for ', bundlePath, hash);
      return hash;
    } catch (error) {
      console.log('ReactNativeSimpleOtaExample Failed to get hash of bundlePath: ', bundlePath, error);
      return null;
    }
  }

  async getDecompressedBundlePatchPath(compressedBundlePath: string): Promise<string | null> {
    try {
      return await unzip(compressedBundlePath, RNFS.DocumentDirectoryPath);
    } catch (error) {
      console.error('ReactNativeSimpleOtaExample Unzip failed:', error);
    }
    return null;
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
  patch_url: string;
  bundle_hash: string;
}
