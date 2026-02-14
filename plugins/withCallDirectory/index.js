const { withXcodeProject, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withCallDirectory = (config) => {
    return withDangerousMod(config, [
        'ios',
        async (config) => {
            const projectRoot = config.modRequest.projectRoot;
            const iosDir = path.join(projectRoot, 'ios');
            const targetDir = path.join(iosDir, 'CallDirectoryHandler');

            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir);
            }

            const sourceDir = path.join(projectRoot, 'targets', 'CallDirectoryHandler');

            // Copy Swift file
            fs.copyFileSync(
                path.join(sourceDir, 'CallDirectoryHandler.swift'),
                path.join(targetDir, 'CallDirectoryHandler.swift')
            );

            // Copy Info.plist
            fs.copyFileSync(
                path.join(sourceDir, 'Info.plist'),
                path.join(targetDir, 'Info.plist')
            );

            // Copy Entitlements
            fs.copyFileSync(
                path.join(sourceDir, 'CallDirectoryHandler.entitlements'),
                path.join(targetDir, 'CallDirectoryHandler.entitlements')
            );

            return config;
        },
    ]);
};

module.exports = withCallDirectory;
