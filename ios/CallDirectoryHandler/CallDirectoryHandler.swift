import Foundation
import CallKit

class CallDirectoryHandler: CXCallDirectoryProvider {

    override func beginRequest(with context: CXCallDirectoryExtensionContext) {
        context.delegate = self
        
        // Read from App Group
        guard let userDefaults = UserDefaults(suiteName: "group.com.kacicalvaresi.veto") else {
            print("[CallDirectory] Failed to access App Group")
            context.completeRequest()
            return
        }
        
        // BLOCKING: Add blocking entries for all numbers in blocklist
        if let blockedPhoneNumbers = userDefaults.array(forKey: "veto_list") as? [String] {
            // Sort and add numbers. CallKit requires numbers to be sorted.
            let sortedNumbers = blockedPhoneNumbers.compactMap { Int64($0) }.sorted()
            
            for phoneNumber in sortedNumbers {
                context.addBlockingEntry(withNextSequentialPhoneNumber: phoneNumber)
            }
            
            print("[CallDirectory] Added \(sortedNumbers.count) blocking entries")
        }
        
        // CALLER ID: Add identification entries with labels
        if let fullData = userDefaults.array(forKey: "veto_list_full") as? [[String: String]] {
            // Convert to array of tuples and sort by phone number
            let sortedData = fullData
                .compactMap { entry -> (Int64, String)? in
                    guard let phoneStr = entry["phoneNumber"],
                          let phone = Int64(phoneStr),
                          let label = entry["label"],
                          !label.isEmpty else { return nil }
                    return (phone, label)
                }
                .sorted { $0.0 < $1.0 }
            
            // Add identification entries
            for (phoneNumber, label) in sortedData {
                context.addIdentificationEntry(
                    withNextSequentialPhoneNumber: phoneNumber,
                    label: label
                )
            }
            
            print("[CallDirectory] Added \(sortedData.count) identification entries with labels")
        }
        
        context.completeRequest()
    }
}

extension CallDirectoryHandler: CXCallDirectoryExtensionContextDelegate {

    func requestFailed(for extensionContext: CXCallDirectoryExtensionContext, withError error: Error) {
        print("[CallDirectory] Request failed: \(error.localizedDescription)")
    }

}
