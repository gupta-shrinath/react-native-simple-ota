#include <jni.h>
#include <android/log.h>
#include <fstream>
#include <vector>
#include <cstdint>
#include <cstring>
#include "bzip/bzlib.h"
#include "bspatch.c"

#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, "bspatch", __VA_ARGS__)

// --- Helper: decode int64 from BSDIFF40 ---
static int64_t offtin(const uint8_t *buf) {
    int64_t y = buf[7] & 0x7F;
    for (int i = 6; i >= 0; i--) y = y * 256 + buf[i];
    if (buf[7] & 0x80) y = -y;
    return y;
}

extern "C"
JNIEXPORT jint JNICALL
Java_dev_droid_simpleota_bsdiff_BsDiff_patch(JNIEnv *env, jobject /*this*/,
                                             jstring currentBundlePath_, jstring otaBundlePath_, jstring patchPath_) {
    const char *currentBundlePath = env->GetStringUTFChars(currentBundlePath_, nullptr);
    const char *otaBundlePath = env->GetStringUTFChars(otaBundlePath_, nullptr);
    const char *patchPath = env->GetStringUTFChars(patchPath_, nullptr);

    // --- Read old file ---
    std::ifstream oldFile(currentBundlePath, std::ios::binary | std::ios::ate);
    if (!oldFile.is_open()) {
        LOGE("Failed to open old file: %s", currentBundlePath);
        return -1;
    }
    std::vector<uint8_t> oldBuf(oldFile.tellg());
    oldFile.seekg(0);
    oldFile.read(reinterpret_cast<char*>(oldBuf.data()), oldBuf.size());
    oldFile.close();

    // --- Open patch file ---
    FILE *patchFp = fopen(patchPath, "rb");
    if (!patchFp) {
        LOGE("Failed to open patch file: %s", patchPath);
        return -1;
    }

    // --- Read header (32 bytes) ---
    uint8_t header[32];
    if (fread(header, 1, 32, patchFp) < 32) {
        LOGE("Corrupt patch file: incomplete header");
        fclose(patchFp);
        return -1;
    }

    // --- Validate header ---
    if (memcmp(header, "BSDIFF40", 8) != 0) {
        LOGE("Invalid patch file: wrong magic header");
        fclose(patchFp);
        return -1;
    }

    int64_t ctrlBlockLen = offtin(header + 8);
    int64_t diffBlockLen = offtin(header + 16);
    int64_t newSize      = offtin(header + 24);

    if (ctrlBlockLen < 0 || diffBlockLen < 0 || newSize < 0) {
        LOGE("Corrupt patch: negative header values");
        fclose(patchFp);
        return -1;
    }

    LOGE("BSDIFF40 header parsed successfully:");
    LOGE("  ctrlBlockLen = %lld", (long long)ctrlBlockLen);
    LOGE("  diffBlockLen = %lld", (long long)diffBlockLen);
    LOGE("  newSize      = %lld", (long long)newSize);

    // --- Allocate output buffer ---
    std::vector<uint8_t> newBuf(newSize);

    // --- Open three file pointers for bzip2 streams ---
    FILE *ctrlFp = fopen(patchPath, "rb");
    FILE *diffFp = fopen(patchPath, "rb");
    FILE *extraFp = fopen(patchPath, "rb");
    if (!ctrlFp || !diffFp || !extraFp) {
        LOGE("Failed to reopen patch file for multiple streams");
        if (ctrlFp) fclose(ctrlFp);
        if (diffFp) fclose(diffFp);
        if (extraFp) fclose(extraFp);
        fclose(patchFp);
        return -1;
    }

    // Seek to correct positions for each block
    fseeko(ctrlFp, 32, SEEK_SET);
    fseeko(diffFp, 32 + ctrlBlockLen, SEEK_SET);
    fseeko(extraFp, 32 + ctrlBlockLen + diffBlockLen, SEEK_SET);

    // --- Open bzip2 streams ---
    int bzerrCtrl, bzerrDiff, bzerrExtra;
    BZFILE *bz2Ctrl = BZ2_bzReadOpen(&bzerrCtrl, ctrlFp, 0, 0, nullptr, 0);
    BZFILE *bz2Diff = BZ2_bzReadOpen(&bzerrDiff, diffFp, 0, 0, nullptr, 0);
    BZFILE *bz2Extra = BZ2_bzReadOpen(&bzerrExtra, extraFp, 0, 0, nullptr, 0);
    if (bzerrCtrl != BZ_OK || bzerrDiff != BZ_OK || bzerrExtra != BZ_OK) {
        LOGE("Failed to open bzip2 streams");
        if (bz2Ctrl) BZ2_bzReadClose(&bzerrCtrl, bz2Ctrl);
        if (bz2Diff) BZ2_bzReadClose(&bzerrDiff, bz2Diff);
        if (bz2Extra) BZ2_bzReadClose(&bzerrExtra, bz2Extra);
        fclose(ctrlFp);
        fclose(diffFp);
        fclose(extraFp);
        fclose(patchFp);
        return -1;
    }

    // --- Apply patch algorithm ---
    int64_t oldpos = 0, newpos = 0;
    int64_t ctrl[3];
    int bzErr;
    while (newpos < newSize) {
        // Read control data (3 * 8 bytes)
        for (int i = 0; i < 3; i++) {
            uint8_t buf[8];
            BZ2_bzRead(&bzerrCtrl, bz2Ctrl, buf, 8);
            if (bzerrCtrl != BZ_OK && bzerrCtrl != BZ_STREAM_END) {
                LOGE("Error reading control block");
                goto cleanup;
            }
            ctrl[i] = offtin(buf);
        }

        if (newpos + ctrl[0] > newSize) {
            LOGE("Corrupt patch: newpos out of range");
            goto cleanup;
        }

        // Read diff block
        std::vector<uint8_t> diff(ctrl[0]);
        BZ2_bzRead(&bzerrDiff, bz2Diff, diff.data(), ctrl[0]);
        if (bzerrDiff != BZ_OK && bzerrDiff != BZ_STREAM_END) {
            LOGE("Error reading diff block");
            goto cleanup;
        }

        for (int i = 0; i < ctrl[0]; i++) {
            if ((oldpos + i >= 0) && (oldpos + i < (int64_t)oldBuf.size()))
                newBuf[newpos + i] = diff[i] + oldBuf[oldpos + i];
            else
                newBuf[newpos + i] = diff[i];
        }

        newpos += ctrl[0];
        oldpos += ctrl[0];

        if (newpos + ctrl[1] > newSize) {
            LOGE("Corrupt patch: newpos+ctrl[1] out of range");
            goto cleanup;
        }

        // Read extra block
        BZ2_bzRead(&bzerrExtra, bz2Extra, &newBuf[newpos], ctrl[1]);
        if (bzerrExtra != BZ_OK && bzerrExtra != BZ_STREAM_END) {
            LOGE("Error reading extra block");
            goto cleanup;
        }

        newpos += ctrl[1];
        oldpos += ctrl[2];
    }

    // --- Write new file ---
    {
        std::ofstream newFile(otaBundlePath, std::ios::binary);
        if (!newFile.is_open()) {
            LOGE("Failed to open output file: %s", otaBundlePath);
            goto cleanup;
        }
        newFile.write(reinterpret_cast<char*>(newBuf.data()), newBuf.size());
    }

    LOGE("Patch applied successfully. New file size = %lld bytes", (long long)newSize);

    cleanup:
    BZ2_bzReadClose(&bzerrCtrl, bz2Ctrl);
    BZ2_bzReadClose(&bzerrDiff, bz2Diff);
    BZ2_bzReadClose(&bzerrExtra, bz2Extra);
    fclose(ctrlFp);
    fclose(diffFp);
    fclose(extraFp);
    fclose(patchFp);

    env->ReleaseStringUTFChars(currentBundlePath_, currentBundlePath);
    env->ReleaseStringUTFChars(otaBundlePath_, otaBundlePath);
    env->ReleaseStringUTFChars(patchPath_, patchPath);

    return 0;
}
