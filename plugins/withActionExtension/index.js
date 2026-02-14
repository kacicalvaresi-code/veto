const { withXcodeProject, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withActionExtension = (config) => {
    return withDangerousMod(config, [
        'ios',
        async (config) => {
            const projectRoot = config.modRequest.projectRoot;
            const iosDir = path.join(projectRoot, 'ios');
            const targetDir = path.join(iosDir, 'Action');

            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir);
            }

            const sourceDir = path.join(projectRoot, 'targets', 'Action');

            // Copy Swift file
            fs.copyFileSync(
                path.join(sourceDir, 'ActionViewController.swift'),
                path.join(targetDir, 'ActionViewController.swift')
            );

            // Copy Info.plist
            fs.copyFileSync(
                path.join(sourceDir, 'Info.plist'),
                path.join(targetDir, 'Info.plist')
            );

            // Copy Entitlements
            fs.copyFileSync(
                path.join(sourceDir, 'Action.entitlements'),
                path.join(targetDir, 'Action.entitlements')
            );

            return config;
        },
    ]);
};

module.exports = withActionExtension;
