import Foundation

// MARK: - VetoMetricsModule
// Native bridge module that exposes metrics (calls blocked, texts filtered)
// and audit log management to React Native.
// Data is stored in the App Group UserDefaults so it is shared with
// the CallDirectoryHandler and MessageFilter extensions.

@objc(VetoMetricsModule)
class VetoMetricsModule: NSObject {

    // MARK: - App Group UserDefaults
    private let appGroupID = "group.com.kacicalvaresi.veto"
    private var sharedDefaults: UserDefaults? {
        return UserDefaults(suiteName: appGroupID)
    }

    // MARK: - Keys
    private let callsBlockedKey = "veto_calls_blocked"
    private let textsFilteredKey = "veto_texts_filtered"
    private let auditLogKey = "veto_audit_log"

    // MARK: - React Native Export
    @objc static func requiresMainQueueSetup() -> Bool { return false }

    // MARK: - Add Audit Log Entry
    @objc func addAuditLogEntry(
        _ phoneNumber: String,
        type: String,
        action: String,
        label: String?,
        resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        guard let defaults = sharedDefaults else {
            rejecter("APP_GROUP_ERROR", "Could not access App Group", nil)
            return
        }

        // Build the log entry
        var entry: [String: Any] = [
            "id": UUID().uuidString,
            "phoneNumber": phoneNumber,
            "type": type,
            "action": action,
            "timestamp": ISO8601DateFormatter().string(from: Date())
        ]
        if let label = label { entry["label"] = label }

        // Append to existing log (keep last 500 entries)
        var log = defaults.array(forKey: auditLogKey) as? [[String: Any]] ?? []
        log.append(entry)
        if log.count > 500 { log = Array(log.suffix(500)) }
        defaults.set(log, forKey: auditLogKey)

        // Increment counters
        if action == "blocked" {
            if type == "call" {
                let current = defaults.integer(forKey: callsBlockedKey)
                defaults.set(current + 1, forKey: callsBlockedKey)
            } else if type == "text" {
                let current = defaults.integer(forKey: textsFilteredKey)
                defaults.set(current + 1, forKey: textsFilteredKey)
            }
        }

        resolver(true)
    }

    // MARK: - Get Metrics
    @objc func getMetrics(
        _ resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        guard let defaults = sharedDefaults else {
            // Return zeros gracefully if App Group is unavailable
            resolver(["callsBlocked": 0, "textsFiltered": 0])
            return
        }

        let callsBlocked = defaults.integer(forKey: callsBlockedKey)
        let textsFiltered = defaults.integer(forKey: textsFilteredKey)
        resolver(["callsBlocked": callsBlocked, "textsFiltered": textsFiltered])
    }

    // MARK: - Reset Metrics
    @objc func resetMetrics(
        _ resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        guard let defaults = sharedDefaults else {
            rejecter("APP_GROUP_ERROR", "Could not access App Group", nil)
            return
        }
        defaults.set(0, forKey: callsBlockedKey)
        defaults.set(0, forKey: textsFilteredKey)
        resolver(true)
    }
}
