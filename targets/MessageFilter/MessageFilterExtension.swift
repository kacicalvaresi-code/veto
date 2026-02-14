import IdentityLookup

final class MessageFilterExtension: ILMessageFilterExtension {

}

extension MessageFilterExtension: ILMessageFilterQueryHandling {

    func handle(_ queryRequest: ILMessageFilterQueryRequest, context: ILMessageFilterExtensionContext, completion: @escaping (ILMessageFilterQueryResponse) -> Void) {
        
        let offlineAction = self.offlineAction(for: queryRequest)

        switch offlineAction {
        case .allow, .junk, .promotion, .transaction:
            // If we have a definitive answer from offline check, return it.
            let response = ILMessageFilterQueryResponse()
            response.action = offlineAction
            completion(response)
            
        case .none:
            // If offline check didn't decide, we could defer to network (not implemented for MVP)
            // or just allow.
            let response = ILMessageFilterQueryResponse()
            response.action = .allow
            completion(response)
            
        @unknown default:
            let response = ILMessageFilterQueryResponse()
            response.action = .allow
            completion(response)
        }
    }

    private func offlineAction(for queryRequest: ILMessageFilterQueryRequest) -> ILMessageFilterAction {
        guard let messageBody = queryRequest.messageBody?.lowercased() else { return .none }
        guard let sender = queryRequest.sender else { return .none }
        
        // 1. Check Blocklist (Sender)
        if let userDefaults = UserDefaults(suiteName: "group.com.kacicalvaresi.veto"),
           let blockedPhoneNumbers = userDefaults.array(forKey: "veto_list") as? [String] {
            
            // Normalize sender for comparison (simplistic)
            let normalizedSender = sender.replacingOccurrences(of: "\\D", with: "", options: .regularExpression)
            if blockedPhoneNumbers.contains(normalizedSender) {
                return .junk
            }
        }

        // 2. Check Content Keywords (Optional Phase 2 feature)
        // let spamKeywords = ["lottery", "winner", "unsubscribe"]
        // for keyword in spamKeywords {
        //    if messageBody.contains(keyword) { return .app } // .junk or .promotion
        // }

        return .none
    }

}
