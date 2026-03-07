import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { requireNativeModule } from 'expo-modules-core';

// Native module bridge — wrapped in try/catch to prevent crash if module not available
let ScamBaiterNative: any = null;
try {
  ScamBaiterNative = requireNativeModule('ScamBaiter');
} catch (e) {
  console.warn('ScamBaiter native module not available:', e);
}

interface Persona {
  id: string;
  name: string;
  description: string;
  emoji: string;
}

interface BaitingState {
  isActive: boolean;
  currentState: string;
  turn: number;
  scamType: string;
  scammerLines: string[];
  baiterLines: string[];
}

export default function ScamBaiterScreen() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<string>('grandma');
  const [activeTab, setActiveTab] = useState<'greeting' | 'baiter'>('greeting');
  const [isGenerating, setIsGenerating] = useState(false);
  const [greetingReady, setGreetingReady] = useState(false);
  const [greetingPath, setGreetingPath] = useState<string | null>(null);
  const [baitingState, setBaitingState] = useState<BaitingState>({
    isActive: false,
    currentState: 'idle',
    turn: 0,
    scamType: 'unknown',
    scammerLines: [],
    baiterLines: [],
  });
  const [callSummary, setCallSummary] = useState<any>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadPersonas();
  }, []);

  useEffect(() => {
    if (baitingState.isActive) {
      startPulseAnimation();
    } else {
      pulseAnim.setValue(1);
    }
  }, [baitingState.isActive]);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const loadPersonas = async () => {
    try {
      const list = ScamBaiterNative.getPersonas();
      setPersonas(list);
    } catch (e) {
      console.error('Failed to load personas:', e);
      // Fallback personas if native module not available
      setPersonas([
        { id: 'grandma', name: 'Confused Grandma', description: 'A sweet elderly woman who can never quite find her reading glasses.', emoji: '👵' },
        { id: 'grandpa', name: 'Hard-of-Hearing Grandpa', description: 'A friendly old man who keeps asking you to speak up.', emoji: '👴' },
        { id: 'child', name: 'Curious Child', description: 'A young kid who asks endless questions about everything.', emoji: '👦' },
        { id: 'parent', name: 'Distracted Parent', description: 'A frazzled parent constantly interrupted by kids and chaos.', emoji: '🧑‍🍳' },
      ]);
    }
  };

  const generateGreeting = async () => {
    setIsGenerating(true);
    setGreetingReady(false);
    try {
      const result = await ScamBaiterNative.generateGreeting(selectedPersona);
      setGreetingPath(result.filePath);
      setGreetingReady(true);
      Alert.alert(
        'Greeting Ready!',
        `Your ${result.persona} voicemail greeting has been generated. To use it:\n\n1. Open the Phone app\n2. Go to Voicemail tab\n3. Tap "Greeting" in the top-left\n4. Tap "Custom"\n5. Record over it by playing this greeting near your phone\n\nThe greeting file is saved and ready to play.`,
        [{ text: 'Got It' }]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to generate greeting');
    } finally {
      setIsGenerating(false);
    }
  };

  const startBaiting = async () => {
    setCallSummary(null);
    try {
      await ScamBaiterNative.startBaiting(selectedPersona);
      setBaitingState({
        isActive: true,
        currentState: 'greeting',
        turn: 0,
        scamType: 'unknown',
        scammerLines: [],
        baiterLines: [],
      });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to start baiting');
    }
  };

  const stopBaiting = async () => {
    try {
      const summary = ScamBaiterNative.stopBaiting();
      setBaitingState(prev => ({ ...prev, isActive: false, currentState: 'idle' }));
      setCallSummary(summary);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to stop baiting');
    }
  };

  const getPersonaById = (id: string): Persona | undefined => {
    return personas.find(p => p.id === id);
  };

  const selectedPersonaData = getPersonaById(selectedPersona);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Scam Baiter</Text>
          <Text style={styles.headerSubtitle}>
            Waste scammers' time with AI-powered personas
          </Text>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'greeting' && styles.tabActive]}
            onPress={() => setActiveTab('greeting')}
          >
            <Text style={[styles.tabText, activeTab === 'greeting' && styles.tabTextActive]}>
              Voicemail Trap
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'baiter' && styles.tabActive]}
            onPress={() => setActiveTab('baiter')}
          >
            <Text style={[styles.tabText, activeTab === 'baiter' && styles.tabTextActive]}>
              Call Back & Bait
            </Text>
          </TouchableOpacity>
        </View>

        {/* Persona Selector */}
        <Text style={styles.sectionTitle}>Choose Your Persona</Text>
        <View style={styles.personaGrid}>
          {personas.map(persona => (
            <TouchableOpacity
              key={persona.id}
              style={[
                styles.personaCard,
                selectedPersona === persona.id && styles.personaCardSelected,
              ]}
              onPress={() => setSelectedPersona(persona.id)}
            >
              <Text style={styles.personaEmoji}>{persona.emoji}</Text>
              <Text style={styles.personaName}>{persona.name}</Text>
              <Text style={styles.personaDesc} numberOfLines={2}>
                {persona.description}
              </Text>
              {selectedPersona === persona.id && (
                <View style={styles.selectedBadge}>
                  <Text style={styles.selectedBadgeText}>Selected</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Voicemail Trap Tab */}
        {activeTab === 'greeting' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Voicemail Trap</Text>
            <View style={styles.infoCard}>
              <Text style={styles.infoText}>
                Generate a custom voicemail greeting that sounds like a real person answering the phone. 
                When a scammer calls and gets your voicemail, they'll think they've reached a live person 
                and waste time talking to your {selectedPersonaData?.name || 'persona'}.
              </Text>
            </View>

            <View style={styles.stepsCard}>
              <Text style={styles.stepsTitle}>How It Works</Text>
              <View style={styles.step}>
                <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
                <Text style={styles.stepText}>Generate a greeting with your chosen persona below</Text>
              </View>
              <View style={styles.step}>
                <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
                <Text style={styles.stepText}>Set it as your voicemail greeting in the Phone app</Text>
              </View>
              <View style={styles.step}>
                <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
                <Text style={styles.stepText}>Spam calls hit voicemail and hear a "real person"</Text>
              </View>
              <View style={styles.step}>
                <View style={styles.stepNumber}><Text style={styles.stepNumberText}>4</Text></View>
                <Text style={styles.stepText}>Scammers waste their time talking to your persona</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, isGenerating && styles.buttonDisabled]}
              onPress={generateGreeting}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <View style={styles.buttonContent}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.primaryButtonText}>  Generating...</Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>
                  Generate {selectedPersonaData?.name} Greeting
                </Text>
              )}
            </TouchableOpacity>

            {greetingReady && (
              <View style={styles.successCard}>
                <Text style={styles.successEmoji}>✅</Text>
                <Text style={styles.successTitle}>Greeting Ready!</Text>
                <Text style={styles.successText}>
                  Your voicemail trap is generated. Open the Phone app to set it as your custom greeting.
                </Text>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => Linking.openURL('tel://')}
                >
                  <Text style={styles.secondaryButtonText}>Open Phone App</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Call Back & Bait Tab */}
        {activeTab === 'baiter' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Call Back & Bait</Text>
            <View style={styles.infoCard}>
              <Text style={styles.infoText}>
                After screening a spam voicemail, call the scammer back and let Veto's AI take over. 
                The conversation engine listens to the scammer, detects their tactics, and responds 
                as your chosen persona — all on-device, completely private.
              </Text>
            </View>

            <View style={styles.stepsCard}>
              <Text style={styles.stepsTitle}>How to Use</Text>
              <View style={styles.step}>
                <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
                <Text style={styles.stepText}>Call the scammer's number back on speakerphone</Text>
              </View>
              <View style={styles.step}>
                <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
                <Text style={styles.stepText}>Tap "Start Baiting" below when they answer</Text>
              </View>
              <View style={styles.step}>
                <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
                <Text style={styles.stepText}>Veto listens and responds as your persona</Text>
              </View>
              <View style={styles.step}>
                <View style={styles.stepNumber}><Text style={styles.stepNumberText}>4</Text></View>
                <Text style={styles.stepText}>Watch the live transcript and enjoy the show</Text>
              </View>
            </View>

            {!baitingState.isActive ? (
              <TouchableOpacity
                style={styles.baitButton}
                onPress={startBaiting}
              >
                <Text style={styles.baitButtonEmoji}>{selectedPersonaData?.emoji || '🎭'}</Text>
                <Text style={styles.baitButtonText}>Start Baiting</Text>
                <Text style={styles.baitButtonSubtext}>as {selectedPersonaData?.name}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.liveSession}>
                {/* Animated listening indicator */}
                <Animated.View style={[styles.listeningIndicator, { transform: [{ scale: pulseAnim }] }]}>
                  <Text style={styles.listeningEmoji}>{selectedPersonaData?.emoji || '🎭'}</Text>
                </Animated.View>
                <Text style={styles.listeningText}>
                  {selectedPersonaData?.name} is talking to the scammer...
                </Text>
                <Text style={styles.turnCounter}>
                  Turn {baitingState.turn} | Detected: {baitingState.scamType}
                </Text>

                {/* Live transcript */}
                <View style={styles.transcriptContainer}>
                  <Text style={styles.transcriptTitle}>Live Transcript</Text>
                  <ScrollView style={styles.transcriptScroll} nestedScrollEnabled>
                    {baitingState.baiterLines.map((line, i) => (
                      <View key={`b-${i}`} style={styles.baiterLine}>
                        <Text style={styles.baiterLabel}>{selectedPersonaData?.emoji} {selectedPersonaData?.name}:</Text>
                        <Text style={styles.baiterText}>{line}</Text>
                      </View>
                    ))}
                    {baitingState.scammerLines.map((line, i) => (
                      <View key={`s-${i}`} style={styles.scammerLine}>
                        <Text style={styles.scammerLabel}>Scammer:</Text>
                        <Text style={styles.scammerText}>{line}</Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>

                <TouchableOpacity
                  style={styles.stopButton}
                  onPress={stopBaiting}
                >
                  <Text style={styles.stopButtonText}>End Session</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Call Summary */}
            {callSummary && !baitingState.isActive && (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Session Complete</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Persona:</Text>
                  <Text style={styles.summaryValue}>{callSummary.persona}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Turns:</Text>
                  <Text style={styles.summaryValue}>{callSummary.totalTurns}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Scam Type:</Text>
                  <Text style={styles.summaryValue}>{callSummary.detectedScamType}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Time Wasted:</Text>
                  <Text style={styles.summaryValueHighlight}>
                    ~{Math.round(callSummary.totalTurns * 8)}s
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: '#2C2C2E',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
  },
  personaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
  },
  personaCard: {
    width: '48%',
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    flexGrow: 1,
    flexBasis: '46%',
  },
  personaCardSelected: {
    borderColor: '#00D4AA',
    backgroundColor: '#1A2A25',
  },
  personaEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  personaName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  personaDesc: {
    fontSize: 11,
    color: '#8E8E93',
    lineHeight: 15,
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#00D4AA',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  selectedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000000',
  },
  section: {
    paddingHorizontal: 20,
  },
  infoCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#AEAEB2',
    lineHeight: 20,
  },
  stepsCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  stepsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#00D4AA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000000',
  },
  stepText: {
    fontSize: 13,
    color: '#AEAEB2',
    flex: 1,
  },
  primaryButton: {
    backgroundColor: '#00D4AA',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  secondaryButton: {
    backgroundColor: '#2C2C2E',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00D4AA',
  },
  successCard: {
    backgroundColor: '#1A2A25',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00D4AA33',
  },
  successEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#00D4AA',
    marginBottom: 8,
  },
  successText: {
    fontSize: 13,
    color: '#AEAEB2',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 4,
  },
  baitButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 16,
    paddingVertical: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  baitButtonEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  baitButtonText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  baitButtonSubtext: {
    fontSize: 13,
    color: '#FFFFFF99',
    marginTop: 4,
  },
  liveSession: {
    alignItems: 'center',
    marginBottom: 16,
  },
  listeningIndicator: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FF3B3033',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FF3B30',
  },
  listeningEmoji: {
    fontSize: 48,
  },
  listeningText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  turnCounter: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 16,
  },
  transcriptContainer: {
    width: '100%',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 12,
    maxHeight: 250,
    marginBottom: 16,
  },
  transcriptTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8E8E93',
    marginBottom: 8,
  },
  transcriptScroll: {
    maxHeight: 200,
  },
  baiterLine: {
    marginBottom: 8,
  },
  baiterLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00D4AA',
    marginBottom: 2,
  },
  baiterText: {
    fontSize: 13,
    color: '#FFFFFF',
    lineHeight: 18,
  },
  scammerLine: {
    marginBottom: 8,
  },
  scammerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF3B30',
    marginBottom: 2,
  },
  scammerText: {
    fontSize: 13,
    color: '#AEAEB2',
    lineHeight: 18,
  },
  stopButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  stopButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  summaryCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  summaryValueHighlight: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00D4AA',
  },
});
