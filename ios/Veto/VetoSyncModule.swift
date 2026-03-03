import Foundation
import CallKit

// MARK: - VetoSyncModule
// Native bridge module that writes the sorted binary blocklist file and
// compact labels JSON directly to the App Group container filesystem.
// This enables the CallDirectoryHandler extension to perform O(log n)
// binary search without loading a SQLite driver or large data structures.
@objc(VetoSyncModule)
class VetoSyncModule: NSObject {
    
    private let appGroupID = "group.com.kacicalvaresi.veto"
    private let binaryFileName = "veto_list.bin"
    private let labelsFileName = "veto_labels.json"
    
    @objc static func requiresMainQueueSetup() -> Bool { return false }
    
    // MARK: - Write Binary Blocklist
    
    /// Writes the sorted binary blocklist file and labels JSON to the App Group container.
    /// - Parameters:
    ///   - base64Data: Base64-encoded sorted Int64 binary data (8 bytes per number, little-endian)
    ///   - labelsJson: JSON string of [{p: "phoneNumber", l: "label"}] for caller ID
    ///   - resolver: Resolves with number of entries written
    ///   - rejecter: Rejects with error message
    @objc func writeBinaryBlocklist(
        _ base64Data: String,
        labelsJson: String,
        resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        guard let containerURL = FileManager.default
            .containerURL(forSecurityApplicationGroupIdentifier: appGroupID) else {
            rejecter("APP_GROUP_ERROR", "Could not access App Group container", nil)
            return
        }
        
        do {
            // Write binary file
            let binURL = containerURL.appendingPathComponent(binaryFileName)
            if let binaryData = Data(base64Encoded: base64Data) {
                try binaryData.write(to: binURL, options: .atomic)
                let entryCount = binaryData.count / 8
                
                // Write labels JSON file
                let labelsURL = containerURL.appendingPathComponent(labelsFileName)
                if let labelsData = labelsJson.data(using: .utf8) {
                    try labelsData.write(to: labelsURL, options: .atomic)
                }
                
                // Signal the extension to reload
                let defaults = UserDefaults(suiteName: appGroupID)
                defaults?.set(Date().timeIntervalSince1970, forKey: "veto_last_sync")
                defaults?.synchronize()
                
                // Reload the Call Directory Extension
                CXCallDirectoryManager.sharedInstance.reloadExtension(
                    withIdentifier: "com.kacicalvaresi.veto.CallDirectoryHandler"
                ) { error in
                    if let error = error {
                        print("[VetoSync] Extension reload warning: \(error.localizedDescription)")
                    } else {
                        print("[VetoSync] Extension reloaded successfully")
                    }
                }
                
                print("[VetoSync] Wrote \(entryCount) entries to binary file (\(binaryData.count) bytes)")
                resolver(entryCount)
            } else {
                rejecter("DECODE_ERROR", "Failed to decode base64 binary data", nil)
            }
        } catch {
            rejecter("WRITE_ERROR", "Failed to write files: \(error.localizedDescription)", nil)
        }
    }
    
    // MARK: - Get Sync Status
    
    @objc func getSyncStatus(
        _ resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        guard let containerURL = FileManager.default
            .containerURL(forSecurityApplicationGroupIdentifier: appGroupID) else {
            resolver(["exists": false, "entryCount": 0, "lastSync": 0])
            return
        }
        
        let binURL = containerURL.appendingPathComponent(binaryFileName)
        let defaults = UserDefaults(suiteName: appGroupID)
        let lastSync = defaults?.double(forKey: "veto_last_sync") ?? 0
        
        if let attrs = try? FileManager.default.attributesOfItem(atPath: binURL.path),
           let fileSize = attrs[.size] as? Int {
            let entryCount = fileSize / 8
            resolver(["exists": true, "entryCount": entryCount, "lastSync": lastSync])
        } else {
            resolver(["exists": false, "entryCount": 0, "lastSync": lastSync])
        }
    }
}
