import UIKit
import MobileCoreServices
import MessageUI

class ActionViewController: UIViewController, MFMessageComposeViewControllerDelegate {

    @IBOutlet weak var label: UILabel!

    override func viewDidLoad() {
        super.viewDidLoad()
        
        // 1. Process the input item (should be text from Messages app)
        var messageBody = ""
        
        for item in self.extensionContext!.inputItems as! [NSExtensionItem] {
            for provider in item.attachments! {
                if provider.hasItemConformingToTypeIdentifier(kUTTypePlainText as String) {
                    provider.loadItem(forTypeIdentifier: kUTTypePlainText as String, options: nil, completionHandler: { (text, error) in
                        OperationQueue.main.addOperation {
                            if let text = text as? String {
                                messageBody = text
                                self.presentSMSComposer(body: messageBody)
                            }
                        }
                    })
                    return 
                }
            }
        }
    }

    func presentSMSComposer(body: String) {
        if MFMessageComposeViewController.canSendText() {
            let composeVC = MFMessageComposeViewController()
            composeVC.messageComposeDelegate = self
            composeVC.recipients = ["7726"]
            composeVC.body = body
            self.present(composeVC, animated: true, completion: nil)
        } else {
            // Handle error: SMS not available
            self.extensionContext!.completeRequest(returningItems: self.extensionContext!.inputItems, completionHandler: nil)
        }
    }

    func messageComposeViewController(_ controller: MFMessageComposeViewController, didFinishWith result: MessageComposeResult) {
        controller.dismiss(animated: true) {
            self.extensionContext!.completeRequest(returningItems: self.extensionContext!.inputItems, completionHandler: nil)
        }
    }

}
