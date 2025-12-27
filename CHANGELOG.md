Change Log
==========

Version 1.0.0 *(December 27 2025)*
-------------------------------------------
**What's new**
* Adds new api `getCurrentBundlePath()` to retrieve current JS bundle path.
* Adds new api `patch(currentBundlePath,newBundlePath, patchPath)` to generate new bundle after applying the patch on nthe current bundle using BSPatch algorithm.
* Adds `example-diff` project to showcase new patch api.