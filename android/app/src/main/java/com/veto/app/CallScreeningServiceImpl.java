package com.kacicalvaresi.veto;

import android.content.Context;
import android.content.SharedPreferences;
import android.telecom.Call;
import android.telecom.CallScreeningService;
import android.telecom.Call.Details;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;

public class CallScreeningServiceImpl extends CallScreeningService {

    private static final String TAG = "VetoCallScreening";
    private static final String PREFS_NAME = "VetoBlocklist";
    private static final String BLOCKLIST_KEY = "blocklist";

    @Override
    public void onScreenCall(Details callDetails) {
        String phoneNumber = callDetails.getHandle().getSchemeSpecificPart();
        Log.d(TAG, "Screening call from: " + phoneNumber);
        
        boolean shouldBlock = isPhoneNumberBlocked(phoneNumber);

        CallResponse.Builder responseBuilder = new CallResponse.Builder();

        if (shouldBlock) {
            Log.d(TAG, "Blocking call from: " + phoneNumber);
            responseBuilder.setDisallowCall(true);
            responseBuilder.setRejectCall(true);
            responseBuilder.setSkipCallLog(false);
            responseBuilder.setSkipNotification(true);
        } else {
            Log.d(TAG, "Allowing call from: " + phoneNumber);
            responseBuilder.setDisallowCall(false);
            responseBuilder.setRejectCall(false);
            responseBuilder.setSkipCallLog(false);
            responseBuilder.setSkipNotification(false);
        }

        respondToCall(callDetails, responseBuilder.build());
    }

    private boolean isPhoneNumberBlocked(String phoneNumber) {
        try {
            // Read from SharedPreferences
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String blocklistJson = prefs.getString(BLOCKLIST_KEY, "[]");
            
            Log.d(TAG, "Blocklist JSON: " + blocklistJson);
            
            JSONArray blocklist = new JSONArray(blocklistJson);
            
            // Normalize phone number (remove all non-digits)
            String normalizedInput = normalizePhoneNumber(phoneNumber);
            
            // Check if number is in blocklist
            for (int i = 0; i < blocklist.length(); i++) {
                String blockedNumber = blocklist.getString(i);
                String normalizedBlocked = normalizePhoneNumber(blockedNumber);
                
                if (normalizedInput.equals(normalizedBlocked)) {
                    Log.d(TAG, "Match found: " + phoneNumber + " matches " + blockedNumber);
                    return true;
                }
                
                // Also check if the last 10 digits match (for US numbers with country code)
                if (normalizedInput.length() >= 10 && normalizedBlocked.length() >= 10) {
                    String inputLast10 = normalizedInput.substring(normalizedInput.length() - 10);
                    String blockedLast10 = normalizedBlocked.substring(normalizedBlocked.length() - 10);
                    
                    if (inputLast10.equals(blockedLast10)) {
                        Log.d(TAG, "Partial match found: " + phoneNumber + " matches " + blockedNumber);
                        return true;
                    }
                }
            }
            
            return false;
        } catch (JSONException e) {
            Log.e(TAG, "Error parsing blocklist JSON", e);
            return false;
        } catch (Exception e) {
            Log.e(TAG, "Error checking if phone number is blocked", e);
            return false;
        }
    }
    
    private String normalizePhoneNumber(String phoneNumber) {
        if (phoneNumber == null) {
            return "";
        }
        // Remove all non-digit characters
        return phoneNumber.replaceAll("[^\\d]", "");
    }
}
