const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withCallScreeningService = (config) => {
    // 1. Add Service to AndroidManifest.xml
    config = withAndroidManifest(config, async (config) => {
        const manifest = config.modResults;
        const mainApplication = manifest.manifest.application[0];

        const serviceName = '.CallScreeningServiceImpl'; // Relative to package name

        // Check if service already exists
        const serviceExists = mainApplication.service?.some(
            (service) => service.$['android:name'] === serviceName
        );

        if (!serviceExists) {
            if (!mainApplication.service) mainApplication.service = [];
            mainApplication.service.push({
                $: {
                    'android:name': serviceName,
                    'android:permission': 'android.permission.BIND_SCREENING_SERVICE',
                    'android:exported': 'true',
                },
                'intent-filter': [
                    {
                        action: [
                            { $: { 'android:name': 'android.telecom.CallScreeningService' } },
                        ],
                    },
                ],
            });
        }
        return config;
    });

    // 2. Copy Java Implementation
    config = withDangerousMod(config, [
        'android',
        async (config) => {
            const projectRoot = config.modRequest.projectRoot;
            const androidDir = path.join(projectRoot, 'android');
            const packagePath = path.join(androidDir, 'app', 'src', 'main', 'java', 'com', 'veto', 'app');

            if (!fs.existsSync(packagePath)) {
                fs.mkdirSync(packagePath, { recursive: true });
            }

            const sourceFile = path.join(projectRoot, 'plugins', 'withCallScreeningService', 'CallScreeningServiceImpl.java');
            const destFile = path.join(packagePath, 'CallScreeningServiceImpl.java');

            if (fs.existsSync(sourceFile)) {
                fs.copyFileSync(sourceFile, destFile);
            } else {
                console.warn('CallScreeningServiceImpl.java source not found at', sourceFile);
            }

            return config;
        },
    ]);

    return config;
};

module.exports = withCallScreeningService;
