import ReactNativeSimpleOta from './NativeSimpleOta';
import { type OtaUpdateProvider, type OtaUpdate } from './OtaUpdateProvider';
import type { PatchResult } from './PatchResult';

var _otaUpdateProvider: OtaUpdateProvider | null = null;

const patchResultDescriptions: Record<string, string> = {
  '0': 'Successfully applied patch',
  '-1': 'Failed to open currentBundlePath',
  '-2': 'Failed to open patchPath',
  '-3': 'Corrupted patch file due to incomplete header',
  '-4': 'Invalid patch file due to wrong magic header',
  '-5': 'Corrupted patch file due to negative header values',
  '-6': 'Failed to open patchPath for multiple streams',
  '-7': 'Failed to open bzip2 streams',
  '-8': 'Error reading control block',
  '-9': 'Corrupted patch file due to newpos out of range',
  '-10': 'Error reading diff block',
  '-11': 'Corrupted patch file due to newpos+ctrl[1] out of range',
  '-12': 'Error reading extra block',
  '-13': 'Corrupted patch file due to unable to write expected new size',
  '-14': 'Failed to open newBundlePath',
  '-15': 'Failed to write on newBundlePath',
};

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

export async function patch(
  currentBundlePath: string,
  newBundlePath: string,
  patchPath: string
): Promise<PatchResult> {
  const result = await ReactNativeSimpleOta.patch(
    currentBundlePath,
    newBundlePath,
    patchPath
  );
  return {
    isSuccess: result === 0,
    code: result,
    description: patchResultDescriptions[result],
  };
}

export type { OtaUpdateProvider, OtaUpdate };
