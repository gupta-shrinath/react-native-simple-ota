import ReactNativeSimpleOta from './NativeSimpleOta';
import { type OtaUpdateProvider, type OtaUpdate } from './OtaUpdateProvider';

var _otaUpdateProvider: OtaUpdateProvider | null = null;

export function init(otaUpdateProvider: OtaUpdateProvider) {
  _otaUpdateProvider = otaUpdateProvider;
}

export async function applyOTAIfApplicable(): Promise<void> {
  if (_otaUpdateProvider == null) {
    return;
  }

  if (!_otaUpdateProvider.isUserApplicableForUpdate()) {
    return;
  }

  let otaUpdate = await _otaUpdateProvider.getOtaUpdate();
  if (otaUpdate == null) {
    return;
  }
  ReactNativeSimpleOta.setUpdate(otaUpdate.bundleVersion, otaUpdate.bundlePath);
}

export function rollbackToDefaultBundle() {
  ReactNativeSimpleOta.rollbackToDefaultBundle();
}

export function getBundleVersion(): string | null {
  return ReactNativeSimpleOta.getBundleVersion();
}

export function getCurrentBundlePath(): string | null {
  return ReactNativeSimpleOta.getCurrentBundlePath();
}

export function patch(currentBundlePath: string, newBundlePath: string, patchPath: string): Promise<boolean> {
  return ReactNativeSimpleOta.patch(currentBundlePath, newBundlePath, patchPath);
}

export type { OtaUpdateProvider, OtaUpdate };
