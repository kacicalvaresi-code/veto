import Foundation
import CallKit

class CallDirectoryHandler: CXCallDirectoryProvider {
    
    private let appGroup = "group.com.kacicalvaresi.veto"
    private let binaryFileName = "veto_list.bin"
    private let labelsFileName = "veto_labels.json"
    
    override func beginRequest(with context: CXCallDirectoryExtensionContext) {
        context.delegate = self
        
        // BLOCKING: Use binary flat-file for memory-efficient lookup
        addBlockingEntries(to: context)
        
        // CALLER ID: Use labels JSON for identification entries
        addIdentificationEntries(to: context)
        
        context.completeRequest()
    }
    
    // MARK: - Blocking Entries (Binary File)
    
    private func addBlockingEntries(to context: CXCallDirectoryExtensionContext) {
        guard let containerURL = FileManager.default
            .containerURL(forSecurityApplicationGroupIdentifier: appGroup) else {
            print("[CallDirectory] Failed to access App Group container")
            return
        }
        
        let binURL = containerURL.appendingPathComponent(binaryFileName)
        
        guard FileManager.default.fileExists(atPath: binURL.path),
              let data = try? Data(contentsOf: binURL),
              data.count >= 8 else {
            // Fall back to UserDefaults if binary file not yet written
            addBlockingEntriesFromUserDefaults(to: context)
            return
        }
        
        // Each number is a little-endian Int64 (8 bytes)
        let count = data.count / 8
        print("[CallDirectory] Loading \(count) numbers from binary file (\(data.count) bytes)")
        
        // Numbers in the binary file are already sorted (written sorted by the RN app)
        // Stream directly — no heap allocation of the full array needed
        for i in 0..<count {
            let offset = i * 8
            let value: Int64 = data.withUnsafeBytes {
                $0.load(fromByteOffset: offset, as: Int64.self)
            }
            if value > 0 {
                context.addBlockingEntry(withNextSequentialPhoneNumber: value)
            }
        }
        
        print("[CallDirectory] Added \(count) blocking entries from binary file")
    }
    
    /// Fallback: read from UserDefaults (legacy path, used before first binary sync)
    private func addBlockingEntriesFromUserDefaults(to context: CXCallDirectoryExtensionContext) {
        guard let userDefaults = UserDefaults(suiteName: appGroup),
              let blockedPhoneNumbers = userDefaults.array(forKey: "veto_list") as? [String] else {
            print("[CallDirectory] No blocklist found in UserDefaults either")
            return
        }
        
        let sortedNumbers = blockedPhoneNumbers.compactMap { Int64($0) }.sorted()
        for phoneNumber in sortedNumbers {
            context.addBlockingEntry(withNextSequentialPhoneNumber: phoneNumber)
        }
        print("[CallDirectory] Added \(sortedNumbers.count) blocking entries from UserDefaults (legacy)")
    }
    
    // MARK: - Identification Entries (Labels JSON)
    
    private func addIdentificationEntries(to context: CXCallDirectoryExtensionContext) {
        guard let containerURL = FileManager.default
            .containerURL(forSecurityApplicationGroupIdentifier: appGroup) else {
            return
        }
        
        let labelsURL = containerURL.appendingPathComponent(labelsFileName)
        
        guard FileManager.default.fileExists(atPath: labelsURL.path),
              let data = try? Data(contentsOf: labelsURL),
              let entries = try? JSONDecoder().decode([[String: String]].self, from: data) else {
            // Fall back to UserDefaults labels
            addIdentificationEntriesFromUserDefaults(to: context)
            return
        }
        
        let sortedEntries = entries
            .compactMap { entry -> (Int64, String)? in
                guard let phoneStr = entry["p"],
                      let phone = Int64(phoneStr),
                      let label = entry["l"],
                      !label.isEmpty else { return nil }
                return (phone, label)
            }
            .sorted { $0.0 < $1.0 }
        
        for (phoneNumber, label) in sortedEntries {
            context.addIdentificationEntry(
                withNextSequentialPhoneNumber: phoneNumber,
                label: label
            )
        }
        
        print("[CallDirectory] Added \(sortedEntries.count) identification entries from labels file")
    }
    
    /// Fallback: read labels from UserDefaults (legacy path)
    private func addIdentificationEntriesFromUserDefaults(to context: CXCallDirectoryExtensionContext) {
        guard let userDefaults = UserDefaults(suiteName: appGroup),
              let fullData = userDefaults.array(forKey: "veto_list_full") as? [[String: String]] else {
            return
        }
        
        let sortedData = fullData
            .compactMap { entry -> (Int64, String)? in
                guard let phoneStr = entry["phoneNumber"],
                      let phone = Int64(phoneStr),
                      let label = entry["label"],
                      !label.isEmpty else { return nil }
                return (phone, label)
            }
            .sorted { $0.0 < $1.0 }
        
        for (phoneNumber, label) in sortedData {
            context.addIdentificationEntry(
                withNextSequentialPhoneNumber: phoneNumber,
                label: label
            )
        }
        print("[CallDirectory] Added \(sortedData.count) identification entries from UserDefaults (legacy)")
    }
    
    // MARK: - Binary Search (O(log n) lookup utility)
    
    /// Binary search on sorted binary file data — 1M numbers checked in ~20 steps
    func binarySearch(target: Int64, in data: Data) -> Bool {
        var low = 0
        var high = (data.count / 8) - 1
        
        while low <= high {
            let mid = low + (high - low) / 2
            let offset = mid * 8
            let value: Int64 = data.withUnsafeBytes {
                $0.load(fromByteOffset: offset, as: Int64.self)
            }
            if value == target { return true }
            if value < target { low = mid + 1 }
            else { high = mid - 1 }
        }
        return false
    }
}

extension CallDirectoryHandler: CXCallDirectoryExtensionContextDelegate {
    func requestFailed(for extensionContext: CXCallDirectoryExtensionContext, withError error: Error) {
        print("[CallDirectory] Request failed: \(error.localizedDescription)")
    }
}
