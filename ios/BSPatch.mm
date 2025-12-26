//
//  BSPatch.m
//  ReactNativeSimpleOta
//
//  Created by shrinath.gupta on 26/12/25.
//
#include <fstream>
#include <vector>
#include <cstdint>
#include <cstring>
#include <cstdio>
#include <string>
#include <memory> // For std::unique_ptr
#include <bzlib.h>
#import "BSPatch.h"

@implementation BSPatch

+ (int)bsdiffPatch:(nonnull NSString *)currentBundlePath otaBundlePath:(nonnull NSString *)otaBundlePath patchPath:(nonnull NSString *)patchPath {
  int result = bsdiffPatch(
          [currentBundlePath UTF8String],
          [otaBundlePath UTF8String],
          [patchPath UTF8String]
      );
      
  return result;
}

@end

#define IOSLOG(...) printf("BSPatch: " __VA_ARGS__); printf("\n");

// --- Helper: decode int64 from BSDIFF40 ---
static int64_t offtin(const uint8_t *buf) {
    int64_t y = buf[7] & 0x7F; // Restored correct array access
    for (int i = 6; i >= 0; i--) y = y * 256 + buf[i];
    if (buf[7] & 0x80) y = -y; // Restored correct array access
    return y;
}

// Helper struct for automatically closing BZFILE pointers using unique_ptr
struct BZ2FileDeleter {
    void operator()(BZFILE* f) const {
        int bzerr;
        if (f) BZ2_bzReadClose(&bzerr, f);
    }
};

// Helper struct for automatically closing FILE pointers using unique_ptr
struct FileDeleter {
    void operator()(FILE* f) const {
        if (f) fclose(f);
    }
};

int bsdiffPatch(const char *currentBundlePath, const char *otaBundlePath, const char *patchPath) {
    // --- Read old file ---
    std::ifstream oldFile(currentBundlePath, std::ios::binary | std::ios::ate);
    if (!oldFile.is_open()) {
        IOSLOG("Failed to open old file: %s", currentBundlePath);
        return -1;
    }
    std::vector<uint8_t> oldBuf(oldFile.tellg());
    oldFile.seekg(0);
    oldFile.read(reinterpret_cast<char*>(oldBuf.data()), oldBuf.size());
    oldFile.close();

    // --- Open patch file for header ---
    std::unique_ptr<FILE, FileDeleter> patchFp(fopen(patchPath, "rb"));
    if (!patchFp) {
        IOSLOG("Failed to open patch file: %s", patchPath);
        return -1;
    }
    
    // --- Read header (32 bytes) ---
    uint8_t header[32];
    if (fread(header, 1, 32, patchFp.get()) < 32) {
        IOSLOG("Corrupt patch file: incomplete header");
        return -1;
    }

    // --- Validate header ---
    if (memcmp(header, "BSDIFF40", 8) != 0) {
        IOSLOG("Invalid patch file: wrong magic header");
        return -1;
    }

    int64_t ctrlBlockLen = offtin(header + 8);
    int64_t diffBlockLen = offtin(header + 16);
    int64_t newSize      = offtin(header + 24);

    if (ctrlBlockLen < 0 || diffBlockLen < 0 || newSize < 0) {
        IOSLOG("Corrupt patch: negative header values");
        return -1;
    }

    IOSLOG("BSDIFF40 header parsed: ctrl=%lld, diff=%lld, newSize=%lld",
           (long long)ctrlBlockLen, (long long)diffBlockLen, (long long)newSize);

    // --- Allocate output buffer ---
    std::vector<uint8_t> newBuf(newSize);

    // --- Open three file pointers for bzip2 streams ---
    std::unique_ptr<FILE, FileDeleter> ctrlFp(fopen(patchPath, "rb"));
    std::unique_ptr<FILE, FileDeleter> diffFp(fopen(patchPath, "rb"));
    std::unique_ptr<FILE, FileDeleter> extraFp(fopen(patchPath, "rb"));
    
    if (!ctrlFp || !diffFp || !extraFp) {
        IOSLOG("Failed to reopen patch file for multiple streams");
        return -1;
    }

    // Seek to correct positions for each block
    fseeko(ctrlFp.get(), 32, SEEK_SET);
    fseeko(diffFp.get(), 32 + ctrlBlockLen, SEEK_SET);
    fseeko(extraFp.get(), 32 + ctrlBlockLen + diffBlockLen, SEEK_SET);
    
    int bzerr;
    std::unique_ptr<BZFILE, BZ2FileDeleter> bz2Ctrl(BZ2_bzReadOpen(&bzerr, ctrlFp.get(), 0, 0, nullptr, 0));
    std::unique_ptr<BZFILE, BZ2FileDeleter> bz2Diff(BZ2_bzReadOpen(&bzerr, diffFp.get(), 0, 0, nullptr, 0));
    std::unique_ptr<BZFILE, BZ2FileDeleter> bz2Extra(BZ2_bzReadOpen(&bzerr, extraFp.get(), 0, 0, nullptr, 0));

    if (!bz2Ctrl || !bz2Diff || !bz2Extra || bzerr != BZ_OK) {
        IOSLOG("Failed to open bzip2 streams");
        return -1;
    }

    // --- Apply patch algorithm (FIXED LOGIC) ---
    int64_t oldpos = 0, newpos = 0;
    int64_t ctrl[3];
    
    while (newpos < newSize) {
        // Read control data (3 * 8 bytes)
        for (int i = 0; i < 3; i++) {
            uint8_t buf[8];
            BZ2_bzRead(&bzerr, bz2Ctrl.get(), buf, 8);
            if (bzerr != BZ_OK && bzerr != BZ_STREAM_END) {
                IOSLOG("Error reading control block: %d", bzerr);
                return -1;
            }
            ctrl[i] = offtin(buf);
        }

        if (newpos + ctrl[0] > newSize) {
            IOSLOG("Corrupt patch: newpos out of range");
            return -1;
        }

        // Read diff block
        std::vector<uint8_t> diff(ctrl[0]);
        BZ2_bzRead(&bzerr, bz2Diff.get(), diff.data(), ctrl[0]);
        if (bzerr != BZ_OK && bzerr != BZ_STREAM_END) {
            IOSLOG("Error reading diff block: %d", bzerr);
            return -1;
        }

        // ✅ FIXED: Apply diff with bounds check + else case
        for (int i = 0; i < ctrl[0]; i++) {
            if ((oldpos + i >= 0) && (oldpos + i < (int64_t)oldBuf.size()))
                newBuf[newpos + i] = diff[i] + oldBuf[oldpos + i];
            else
                newBuf[newpos + i] = diff[i];
        }

        newpos += ctrl[0];
        oldpos += ctrl[0];  // ✅ FIXED: ctrl[0] (copy length)

        if (newpos + ctrl[1] > newSize) {
            IOSLOG("Corrupt patch: newpos+ctrl[1] out of range");
            return -1;
        }

        // Read extra block
        BZ2_bzRead(&bzerr, bz2Extra.get(), &newBuf[newpos], ctrl[1]);
        if (bzerr != BZ_OK && bzerr != BZ_STREAM_END) {
            IOSLOG("Error reading extra block: %d", bzerr);
            return -1;
        }

        newpos += ctrl[1];
        oldpos += ctrl[2];  // ✅ FIXED: ctrl[2] (offset)
    }
    
    if (newpos != newSize) {
        IOSLOG("Corrupt patch: did not write expected new size");
        return -1;
    }

    // --- Write new file ---
    {
        std::ofstream newFile(otaBundlePath, std::ios::binary);
        if (!newFile.is_open()) {
            IOSLOG("Failed to open output file: %s", otaBundlePath);
            return -1;
        }
        newFile.write(reinterpret_cast<char*>(newBuf.data()), newBuf.size());
        if (!newFile) {
            IOSLOG("Failed to write output file");
            return -1;
        }
    }

    IOSLOG("✅ Patch applied successfully. New file size = %lld bytes", (long long)newSize);
    return 0; // Success
}
