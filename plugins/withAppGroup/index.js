const { withEntitlementsPlist } = require('@expo/config-plugins');

const withAppGroup = (config) => {
    return withEntitlementsPlist(config, async (config) => {
        const entitlements = config.modResults;
        const appGroupIdentifier = 'group.com.kacicalvaresi.veto';

        if (!entitlements['com.apple.security.application-groups']) {
            entitlements['com.apple.security.application-groups'] = [];
        }

        const existingGroups = entitlements['com.apple.security.application-groups'];
        if (!existingGroups.includes(appGroupIdentifier)) {
            existingGroups.push(appGroupIdentifier);
        }

        return config;
    });
};

module.exports = withAppGroup;
