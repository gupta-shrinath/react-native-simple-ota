export interface OtaUpdateProvider {
  /**
   * A method to defined if check {@link getOtaUpdate} is to be executed
   *
   * You can use this method to define if a user is supposed to get
   * OTA updates.
   */
  isUserApplicableForUpdate(): boolean;

  /**
   * A method to define to get the ota update.
   * @returns null if no ota update is available.
   */
  getOtaUpdate(): Promise<OtaUpdate | null>;
}

export interface OtaUpdate {
  bundleVersion: string;
  bundlePath: string;
}
