#include <jni.h>
#include <android/log.h>
#include <fstream>
#include <vector>
#include <cstdint>
#include <cstring>
#include "bzip/bzlib.h"
#include <string>
#include <memory>

#define LOG(...) __android_log_print(ANDROID_LOG_ERROR, "ReactNativeSimpleOta", __VA_ARGS__)

// --- Helper: decode int64 ---
static int64_t offtin(const uint8_t *buf) {
    int64_t y = buf[7] & 0x7F;
    for (int i = 6; i >= 0; i--) y = y * 256 + buf[i];
    if (buf[7] & 0x80) y = -y;
    return y;
}

struct BZ2FileDeleter {
    void operator()(BZFILE *f) const {
        int bzerr;
        if (f) BZ2_bzReadClose(&bzerr, f);
    }
};

struct FileDeleter {
    void operator()(FILE *f) const {
        if (f) fclose(f);
    }
};

extern "C"
JNIEXPORT jint JNICALL
Java_dev_droid_simpleota_bspatch_BSPatch_patch(JNIEnv *env, jobject /*this*/,
                                             jstring currentBundlePath_, jstring otaBundlePath_,
                                             jstring patchPath_) {

    const char *currentBundlePath = env->GetStringUTFChars(currentBundlePath_, nullptr);
    const char *otaBundlePath = env->GetStringUTFChars(otaBundlePath_, nullptr);
    const char *patchPath = env->GetStringUTFChars(patchPath_, nullptr);

    auto releaseResources = [&]() {
        env->ReleaseStringUTFChars(currentBundlePath_, currentBundlePath);
        env->ReleaseStringUTFChars(otaBundlePath_, otaBundlePath);
        env->ReleaseStringUTFChars(patchPath_, patchPath);
    };

    // 1. Read currentBundlePath file
    std::ifstream oldFile(currentBundlePath, std::ios::binary | std::ios::ate);
    if (!oldFile.is_open()) {
        releaseResources();
        LOG("Failed to open currentBundle file: %s", currentBundlePath);
        return -1;
    }
    std::vector<uint8_t> oldBuf(oldFile.tellg());
    oldFile.seekg(0);
    oldFile.read(reinterpret_cast<char *>(oldBuf.data()), oldBuf.size());
    oldFile.close();

    // 2. Open patch file for header validation
    std::unique_ptr<FILE, FileDeleter> patchFp(fopen(patchPath, "rb"));
    if (!patchFp) {
        releaseResources();
        LOG("Failed to open patch file: %s", patchPath);
        return -2;
    }

    uint8_t header[32];
    if (fread(header, 1, 32, patchFp.get()) < 32) {
        releaseResources();
        LOG("Corrupt patch file: incomplete header");
        return -3;
    }

    if (memcmp(header, "BSDIFF40", 8) != 0) {
        releaseResources();
        LOG("Invalid patch file: wrong magic header");
        return -4;
    }

    int64_t ctrlBlockLen = offtin(header + 8);
    int64_t diffBlockLen = offtin(header + 16);
    int64_t newSize = offtin(header + 24);

    if (ctrlBlockLen < 0 || diffBlockLen < 0 || newSize < 0) {
        releaseResources();
        LOG("Corrupt patch: negative header values");
        return -5;
    }

    // 3. Prepare output and streams
    std::vector<uint8_t> newBuf(newSize);
    std::unique_ptr<FILE, FileDeleter> ctrlFp(fopen(patchPath, "rb"));
    std::unique_ptr<FILE, FileDeleter> diffFp(fopen(patchPath, "rb"));
    std::unique_ptr<FILE, FileDeleter> extraFp(fopen(patchPath, "rb"));

    if (!ctrlFp || !diffFp || !extraFp) {
        LOG("Failed to reopen patch file for multiple streams");
        releaseResources();
        return -6;
    }

    fseek(ctrlFp.get(), 32, SEEK_SET);
    fseek(diffFp.get(), 32 + ctrlBlockLen, SEEK_SET);
    fseek(extraFp.get(), 32 + ctrlBlockLen + diffBlockLen, SEEK_SET);

    int bzerr;
    std::unique_ptr<BZFILE, BZ2FileDeleter> bz2Ctrl(
            BZ2_bzReadOpen(&bzerr, ctrlFp.get(), 0, 0, nullptr, 0));
    std::unique_ptr<BZFILE, BZ2FileDeleter> bz2Diff(
            BZ2_bzReadOpen(&bzerr, diffFp.get(), 0, 0, nullptr, 0));
    std::unique_ptr<BZFILE, BZ2FileDeleter> bz2Extra(
            BZ2_bzReadOpen(&bzerr, extraFp.get(), 0, 0, nullptr, 0));

    if (!bz2Ctrl || !bz2Diff || !bz2Extra || bzerr != BZ_OK) {
        LOG("Failed to open bzip2 streams");
        releaseResources();
        return -7;
    }

    LOG("BSDIFF40 header parsed: ctrl=%lld, diff=%lld, newSize=%lld",
        (long long) ctrlBlockLen, (long long) diffBlockLen, (long long) newSize);
    int64_t oldpos = 0, newpos = 0;
    while (newpos < newSize) {
        int64_t ctrl[3];
        for (int i = 0; i < 3; i++) {
            uint8_t buf[8];
            BZ2_bzRead(&bzerr, bz2Ctrl.get(), buf, 8);
            if (bzerr != BZ_OK && bzerr != BZ_STREAM_END) {
                LOG("Error reading control block: %d", bzerr);
                return -8;
            }
            ctrl[i] = offtin(buf);
        }

        if (newpos + ctrl[0] > newSize) {
            LOG("Corrupt patch: newpos out of range");
            releaseResources();
            return -9;
        }

        BZ2_bzRead(&bzerr, bz2Diff.get(), &newBuf[newpos], ctrl[0]);
        if (bzerr != BZ_OK && bzerr != BZ_STREAM_END) {
            LOG("Error reading diff block: %d", bzerr);
            return -10;
        }

        // ✅ FIXED: Apply diff with bounds check + else case
        for (int i = 0; i < ctrl[0]; i++) {
            if ((oldpos + i >= 0) && (oldpos + i < (int64_t) oldBuf.size())) {
                newBuf[newpos + i] += oldBuf[oldpos + i];
            }
        }

        newpos += ctrl[0];
        oldpos += ctrl[0];

        if (newpos + ctrl[1] > newSize) {
            LOG("Corrupt patch: newpos+ctrl[1] out of range");
            releaseResources();
            return -11;
        }

        BZ2_bzRead(&bzerr, bz2Extra.get(), &newBuf[newpos], ctrl[1]);
        if (bzerr != BZ_OK && bzerr != BZ_STREAM_END) {
            LOG("Error reading extra block: %d", bzerr);
            return -12;
        }
        newpos += ctrl[1];
        oldpos += ctrl[2];
    }

    if (newpos != newSize) {
        LOG("Corrupt patch: did not write expected new size");
        return -13;
    }
    // 5. Write Result
    std::ofstream outFile(otaBundlePath, std::ios::binary);
    if (!outFile.is_open()) {
        releaseResources();
        LOG("Failed to open output file: %s", otaBundlePath);
        return -14;
    }
    outFile.write(reinterpret_cast<char *>(newBuf.data()), newBuf.size());
    if (!outFile) {
        LOG("Failed to write output file");
        return -15;
    }

    releaseResources();
    LOG("✅ Patch applied successfully. New file size %lld bytes", (long long) newSize);
    return 0;
}

