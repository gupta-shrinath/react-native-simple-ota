const bsdiff = require('bsdiff-node');
const path = require('path');

const oldFile = path.join(__dirname, 'ota-updates/old/index.android.bundle');
const newFile = path.join(__dirname, 'ota-updates/new/index.android.bundle');
const patchFile = path.join(__dirname, 'ota-updates/bundle.patch');

bsdiff.diff(oldFile, newFile, patchFile,(result,error)=> {
    console.log('Patch created successfully:', result);
    if (error) {
        console.error('Error creating patch:', error);
    }
});