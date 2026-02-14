const { withXcodeProject, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withSMSFilter = (config) => {
    return withDangerousMod(config, [
        'ios',
        async (config) => {
            const projectRoot = config.modRequest.projectRoot;
            const iosDir = path.join(projectRoot, 'ios');
            const targetDir = path.join(iosDir, 'MessageFilter');

            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir);
            }

            const sourceDir = path.join(projectRoot, 'targets', 'MessageFilter');

            // Copy Swift file
            fs.copyFileSync(
                path.join(sourceDir, 'MessageFilterExtension.swift'),
                path.join(targetDir, 'MessageFilterExtension.swift')
            );

            // Copy Info.plist
            fs.copyFileSync(
                path.join(sourceDir, 'Info.plist'),
                path.join(targetDir, 'Info.plist')
            );

            // Copy Entitlements
            fs.copyFileSync(
                path.join(sourceDir, 'MessageFilter.entitlements'),
                path.join(targetDir, 'MessageFilter.entitlements')
            );

            return config;
        },
    ]);
};

module.exports = withSMSFilter;
