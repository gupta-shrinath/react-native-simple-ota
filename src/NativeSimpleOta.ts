import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  setUpdate(bundleVersion: string, bundlePath: string): void;

  rollbackToDefaultBundle(): void;

  getBundleVersion(): string | null;
}

export default TurboModuleRegistry.getEnforcing<Spec>('ReactNativeSimpleOta');
