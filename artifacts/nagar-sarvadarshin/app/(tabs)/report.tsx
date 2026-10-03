import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { getGetCivicCasesQueryKey, getGetMapIssuesQueryKey, getGetNotificationsQueryKey, useSubmitComplaint } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import type { CivicCaseSummary } from '@/components/CivicUI';
import { ActionButton, CivicCard, Eyebrow, Heading, InlineNotice, PriorityBadge, StatusBadge } from '@/components/CivicUI';
import { IssueMap } from '@/components/IssueMap';
import { useColors } from '@/hooks/useColors';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const CATEGORIES = [
  'Auto-detect',
  'Potholes & Road Damage',
  'Road Obstruction',
  'Illegal Parking',
  'Traffic Signal Issue',
  'Bus Stop / Public Transport Issue',
  'Pedestrian Safety Hazard',
  'Street & Public Infrastructure',
  'Waste Management',
  'Water Supply & Pipeline',
  'Streetlight Issue',
  'Noise Complaint',
  'Public Safety Hazard',
  'Bribe / Corruption Complaint',
];

type CapturedEvidence = { uri: string; imageData: string | null };
type GPSPoint = { latitude: number; longitude: number; accuracy: number | null };

export default function ReportScreen() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [locationPermission, requestLocationPermission] = Location.useForegroundPermissions();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const submitReport = useSubmitComplaint();

  const [evidence, setEvidence] = useState<CapturedEvidence | null>(null);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [torch, setTorch] = useState(false);
  const [location, setLocation] = useState<GPSPoint | null>(null);
  const [locationError, setLocationError] = useState('');
  const [manualLocation, setManualLocation] = useState(false);
  const [manualLatitude, setManualLatitude] = useState('');
  const [manualLongitude, setManualLongitude] = useState('');
  const [address, setAddress] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Auto-detect');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceUri, setVoiceUri] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState('');
  const [candidate, setCandidate] = useState<CivicCaseSummary | null>(null);
  const [analysis, setAnalysis] = useState<{
    category: string;
    subcategory: string;
    severity: string;
    confidence: number;
    priorityScore: number;
    priorityLevel: CivicCaseSummary['priorityLevel'];
    department: string;
    duplicateScore: number;
    reason: string;
  } | null>(null);
  const [submittedCase, setSubmittedCase] = useState<CivicCaseSummary | null>(null);

  useEffect(() => {
    if (cameraPermission && !cameraPermission.granted && cameraPermission.status === 'undetermined') {
      void requestCameraPermission();
    }
  }, [cameraPermission, requestCameraPermission]);

  useEffect(() => {
    if (locationPermission && !locationPermission.granted && locationPermission.status === 'undetermined') {
      void requestLocationPermission();
    }
    if (locationPermission?.granted) void refreshLocation();
  }, [locationPermission, requestLocationPermission]);

  const refreshLocation = async () => {
    setLocationError('');
    try {
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        accuracy: current.coords.accuracy,
      });
    } catch {
      setLocationError('We couldn’t read your position. Try again or enter coordinates manually.');
    }
  };

  const setPhoto = (uri: string, base64: string | null | undefined) => {
    if (!base64) {
      setError('The photo could not be attached. Please capture it again or choose another image.');
      return;
    }
    const imageData = `data:image/jpeg;base64,${base64}`;
    if (imageData && imageData.length > 1_450_000) {
      setError('This photo is too large to attach. Please choose a smaller image.');
      return;
    }
    setError('');
    setEvidence({ uri, imageData });
    setCandidate(null);
    setSubmittedCase(null);
  };

  const capturePhoto = async () => {
    setError('');
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.45, base64: true });
      if (photo?.uri) {
        setPhoto(photo.uri, photo.base64);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch {
      setError('The camera could not capture this photo. Try the gallery instead.');
    }
  };

  const chooseFromGallery = async () => {
    setError('');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      base64: true,
      quality: 0.45,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      if (asset) setPhoto(asset.uri, asset.base64);
    }
  };

  const toggleRecording = async () => {
    setError('');
    try {
      if (!recording) {
        const permission = await AudioModule.requestRecordingPermissionsAsync();
        if (!permission.granted) {
          setError('Microphone permission is needed for a voice note. You can still type a description.');
          return;
        }
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await recorder.prepareToRecordAsync();
        recorder.record();
        setRecording(true);
        return;
      }
      await recorder.stop();
      setVoiceUri(recorder.uri ?? null);
      setRecording(false);
    } catch {
      setRecording(false);
      setError('Voice recording is unavailable on this device. You can type your description instead.');
    }
  };

  const payload = () => {
    if (!evidence) {
      setError('Capture or choose a photo of the issue first.');
      return null;
    }
    if (!location) {
      setError('A live GPS position or manually entered coordinates are required.');
      return null;
    }
    if (title.trim().length < 4 || description.trim().length < 8 || address.trim().length < 1) {
      setError('Add a short title, a useful description, and a nearby landmark.');
      return null;
    }
    setError('');
    return {
      title: title.trim(),
      description: description.trim(),
      category: category === 'Auto-detect' ? null : category,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      address: address.trim(),
      imageData: evidence.imageData,
      voiceTranscript: voiceTranscript.trim() || null,
      isProtected: corruption,
    };
  };

  const invalidateCitizenData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getGetCivicCasesQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetMapIssuesQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() }),
    ]);
  };

  const analyzeAndSubmit = async () => {
    const report = payload();
    if (!report) return;
    setCandidate(null);
    setSubmittedCase(null);
    setAnalysis(null);
    try {
      const response = await submitReport.mutateAsync({ data: report });
      setAnalysis(response.analysis);
      if (response.awaitingDecision && response.candidateCase) {
        setCandidate(response.candidateCase);
      } else if (response.civicCase) {
        setSubmittedCase(response.civicCase);
        await invalidateCitizenData();
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message.replace(/^HTTP \d+ [^:]*:\s*/, '') : 'The report could not be analyzed.');
    }
  };

  const finishDuplicateChoice = async (action: 'link' | 'new') => {
    const report = payload();
    if (!report) return;
    try {
      const response = await submitReport.mutateAsync({
        data: {
          ...report,
          duplicateAction: action,
          linkCaseId: action === 'link' ? candidate?.id : null,
        },
      });
      setAnalysis(response.analysis);
      if (response.civicCase) {
        setSubmittedCase(response.civicCase);
        setCandidate(null);
        await invalidateCitizenData();
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message.replace(/^HTTP \d+ [^:]*:\s*/, '') : 'The report could not be saved.');
    }
  };

  const busy = submitReport.isPending;
  const corruption = category === 'Bribe / Corruption Complaint';

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safe, { backgroundColor: c.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Platform.OS === 'web' ? 132 : insets.bottom + 110 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.pageHeader}>
            <View>
              <Eyebrow>CAPTURE · LOCATE · RESOLVE</Eyebrow>
              <Heading subtitle="One clear photo helps the right city team act faster.">Report an issue</Heading>
            </View>
            <Pressable onPress={() => router.back()} style={[styles.closeButton, { borderColor: c.border, backgroundColor: c.card }]} accessibilityLabel="Close report">
              <Feather name="x" size={19} color={c.foreground} />
            </Pressable>
          </View>

          <View style={[styles.cameraFrame, { borderColor: c.border, backgroundColor: c.surface }]}>
            {evidence ? (
              <Image source={{ uri: evidence.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : cameraPermission?.granted ? (
              <CameraView
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                facing={facing}
                enableTorch={torch}
              />
            ) : (
              <View style={styles.cameraFallback}>
                <View style={[styles.cameraMark, { backgroundColor: c.secondary }]}>
                  <Feather name="camera" size={25} color={c.cyan} />
                </View>
                <Text style={[styles.cameraTitle, { color: c.foreground }]}>Camera access is needed</Text>
                <Text style={[styles.cameraCopy, { color: c.mutedForeground }]}>
                  Take a photo of the issue or choose one from your gallery.
                </Text>
                {cameraPermission?.status === 'denied' && cameraPermission.canAskAgain === false ? (
                  <Text style={[styles.cameraCopy, { color: c.warning }]}>Camera permission is off in your device settings.</Text>
                ) : (
                  <ActionButton label="Allow camera" icon="camera" onPress={() => void requestCameraPermission()} />
                )}
              </View>
            )}
            {!evidence && cameraPermission?.granted ? (
              <View style={styles.cameraTopControls}>
                <Pressable
                  onPress={() => setFacing((current) => current === 'back' ? 'front' : 'back')}
                  style={styles.cameraControl}
                  accessibilityLabel="Switch camera"
                >
                  <Feather name="refresh-cw" size={17} color="#FFFFFF" />
                </Pressable>
                <Pressable
                  onPress={() => setTorch((current) => !current)}
                  style={styles.cameraControl}
                  accessibilityLabel="Toggle camera flash"
                >
                  <Feather name={torch ? 'zap' : 'zap-off'} size={17} color="#FFFFFF" />
                </Pressable>
              </View>
            ) : null}
            {evidence ? (
              <View style={styles.photoTag}>
                <Feather name="check-circle" size={14} color="#FFFFFF" />
                <Text style={styles.photoTagText}>Evidence selected</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.photoActions}>
            {!evidence && cameraPermission?.granted ? (
              <Pressable onPress={() => void capturePhoto()} style={[styles.captureButton, { backgroundColor: c.primary }]} accessibilityLabel="Capture photo" testID="capture-photo">
                <Feather name="camera" size={22} color={c.primaryForeground} />
              </Pressable>
            ) : null}
            <ActionButton
              label={evidence ? 'Retake photo' : 'Choose from gallery'}
              icon={evidence ? 'rotate-ccw' : 'image'}
              variant="outline"
              onPress={evidence ? () => setEvidence(null) : () => void chooseFromGallery()}
              style={{ flex: 1 }}
            />
            {evidence ? (
              <Pressable onPress={() => setEvidence(null)} style={[styles.removePhoto, { borderColor: c.border }]} accessibilityLabel="Remove photo">
                <Feather name="trash-2" size={17} color={c.destructive} />
              </Pressable>
            ) : null}
          </View>

          <View style={styles.locationBlock}>
            <View style={styles.sectionHeading}>
              <View style={{ flex: 1 }}>
                <Eyebrow>LIVE GPS</Eyebrow>
                <Text style={[styles.blockTitle, { color: c.foreground }]}>Where is the issue?</Text>
              </View>
              <View style={[styles.gpsState, { backgroundColor: location ? `${c.success}1A` : `${c.warning}1A` }]}>
                <View style={[styles.gpsDot, { backgroundColor: location ? c.success : c.warning }]} />
                <Text style={[styles.gpsStateText, { color: location ? c.success : c.warning }]}>{location ? 'GPS active' : 'Waiting for GPS'}</Text>
              </View>
            </View>
            {location ? (
              <>
                <IssueMap cases={[]} center={location} draggable onMove={(point) => setLocation((current) => current ? { ...current, ...point } : current)} height={180} />
                <Text style={[styles.coordinateText, { color: c.mutedForeground }]}>
                  {location.latitude.toFixed(5)} · {location.longitude.toFixed(5)} · accuracy ±{Math.round(location.accuracy ?? 0)} m
                </Text>
              </>
            ) : (
              <CivicCard style={styles.gpsCard}>
                <Feather name="map-pin" size={19} color={c.warning} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[styles.gpsCardTitle, { color: c.foreground }]}>Location access is required</Text>
                  <Text style={[styles.cameraCopy, { color: c.mutedForeground }]}>
                    {locationError || 'We use your current position to route this case and check for nearby reports.'}
                  </Text>
                </View>
              </CivicCard>
            )}
            {locationPermission?.granted ? (
              <Pressable onPress={() => void refreshLocation()} style={styles.tryAgain} hitSlop={8}>
                <Feather name="refresh-cw" size={13} color={c.cyan} />
                <Text style={[styles.tryAgainText, { color: c.cyan }]}>Refresh location</Text>
              </Pressable>
            ) : (
              <View style={styles.locationButtons}>
                <ActionButton label="Try again" icon="crosshair" onPress={() => {
                  void (async () => {
                    const result = await requestLocationPermission();
                    if (result.granted) await refreshLocation();
                  })();
                }} style={{ flex: 1 }} />
                <ActionButton label="Enter manually" icon="edit-3" variant="outline" onPress={() => setManualLocation((value) => !value)} style={{ flex: 1 }} />
              </View>
            )}
            {manualLocation && !location ? (
              <View style={styles.manualFields}>
                <View style={styles.coordRow}>
                  <SmallField label="Latitude" placeholder="e.g. 30.7415" value={manualLatitude} onChangeText={(value) => {
                    setManualLatitude(value);
                    updateManualLocation(value, manualLongitude, setLocation);
                  }} keyboardType="decimal-pad" />
                  <SmallField label="Longitude" placeholder="e.g. 76.7681" value={manualLongitude} onChangeText={(value) => {
                    setManualLongitude(value);
                    updateManualLocation(manualLatitude, value, setLocation);
                  }} keyboardType="decimal-pad" />
                </View>
                <Text style={[styles.manualHint, { color: c.mutedForeground }]}>Enter both coordinates from the map. The app will not use a guessed position.</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.fields}>
            <View>
              <Eyebrow>ISSUE DETAILS</Eyebrow>
              <Text style={[styles.blockTitle, { color: c.foreground, marginTop: 6 }]}>Help the team understand</Text>
            </View>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Short issue title"
              placeholderTextColor={c.mutedForeground}
              style={[styles.input, { color: c.foreground, backgroundColor: c.surface, borderColor: c.border }]}
              maxLength={120}
              testID="report-title"
            />
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="Nearby street, landmark, or stop"
              placeholderTextColor={c.mutedForeground}
              style={[styles.input, { color: c.foreground, backgroundColor: c.surface, borderColor: c.border }]}
              maxLength={240}
              testID="report-address"
            />
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Describe what happened and who may be affected"
              placeholderTextColor={c.mutedForeground}
              style={[styles.input, styles.multiline, { color: c.foreground, backgroundColor: c.surface, borderColor: c.border }]}
              multiline
              maxLength={1000}
              textAlignVertical="top"
              testID="report-description"
            />
            <View style={styles.categoryHeader}>
              <Text style={[styles.fieldLabel, { color: c.secondaryForeground }]}>Category</Text>
              <Text style={[styles.autoLabel, { color: c.cyan }]}>AI auto-detect enabled</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
              {CATEGORIES.map((item) => {
                const selected = item === category;
                return (
                  <Pressable
                    key={item}
                    onPress={() => setCategory(item)}
                    style={[styles.categoryChip, { backgroundColor: selected ? c.primary : c.secondary, borderColor: selected ? c.primary : c.border }]}
                  >
                    <Text style={[styles.categoryText, { color: selected ? c.primaryForeground : c.secondaryForeground }]}>{item}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <CivicCard style={styles.voiceCard}>
              <View style={[styles.voiceIcon, { backgroundColor: c.secondary }]}>
                <Feather name="mic" size={17} color={c.cyan} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.gpsCardTitle, { color: c.foreground }]}>Optional voice note</Text>
                <Text style={[styles.cameraCopy, { color: c.mutedForeground }]}>
                  {voiceUri ? 'Audio stays on this device. Type a written summary to attach it to the case.' : 'Record a note locally, then type a summary if you want to share its details.'}
                </Text>
              </View>
              <Pressable onPress={() => void toggleRecording()} style={[styles.recordButton, { backgroundColor: recording ? c.destructive : c.secondary }]} testID="voice-record">
                <Feather name={recording ? 'square' : 'mic'} size={15} color={recording ? c.destructiveForeground : c.foreground} />
              </Pressable>
            </CivicCard>
            {voiceUri ? (
              <TextInput
                value={voiceTranscript}
                onChangeText={setVoiceTranscript}
                placeholder="Type a voice-note summary to attach to the case"
                placeholderTextColor={c.mutedForeground}
                style={[styles.input, { color: c.foreground, backgroundColor: c.surface, borderColor: c.border }]}
                maxLength={1200}
              />
            ) : null}
            {corruption ? (
              <InlineNotice text="Protected reporting: your identity is restricted from normal employee views. Authorized personnel may access it when required for case handling." icon="shield" />
            ) : null}
          </View>

          {error ? <InlineNotice text={error} icon="alert-circle" /> : null}

          {analysis ? (
            <CivicCard style={styles.analysisCard}>
              <View style={styles.sectionHeading}>
                <View>
                  <Eyebrow>PROTOTYPE INTELLIGENCE</Eyebrow>
                  <Text style={[styles.blockTitle, { color: c.foreground, marginTop: 5 }]}>AI issue analysis</Text>
                </View>
                <PriorityBadge level={analysis.priorityLevel} />
              </View>
              <View style={styles.analysisRow}>
                <AnalysisMetric label="Category" value={analysis.category} />
                <AnalysisMetric label="Severity" value={analysis.severity} />
              </View>
              <View style={styles.analysisRow}>
                <AnalysisMetric label="Confidence" value={`${analysis.confidence}%`} />
                <AnalysisMetric label="Priority" value={`${analysis.priorityScore} / 100`} />
              </View>
              <AnalysisMetric label="Recommended team" value={analysis.department} />
              <Text style={[styles.manualHint, { color: c.mutedForeground }]}>{analysis.reason}</Text>
              <Text style={[styles.manualHint, { color: c.mutedForeground }]}>Rule-based prototype analysis, not a measured AI accuracy score.</Text>
            </CivicCard>
          ) : null}

          {candidate ? (
            <CivicCard style={styles.candidateCard}>
              <View style={styles.candidateTitleRow}>
                <View style={[styles.candidateIcon, { backgroundColor: `${c.warning}1A` }]}>
                  <Feather name="git-merge" size={17} color={c.warning} />
                </View>
                <View style={{ flex: 1 }}>
                  <Eyebrow>POSSIBLE DUPLICATE</Eyebrow>
                  <Text style={[styles.gpsCardTitle, { color: c.foreground, marginTop: 5 }]}>Existing Civic Case found</Text>
                </View>
              </View>
              <View style={[styles.matchCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={styles.sectionHeading}>
                  <Text style={[styles.caseNumber, { color: c.cyan }]}>{candidate.caseNumber}</Text>
                  <Text style={[styles.matchScore, { color: c.warning }]}>{analysis?.duplicateScore ?? 0}% match</Text>
                </View>
                <Text style={[styles.caseTitle, { color: c.foreground }]}>{candidate.title}</Text>
                <Text style={[styles.cameraCopy, { color: c.mutedForeground }]}>{candidate.reportCount} related reports · {candidate.address}</Text>
                <View style={styles.caseFooter}>
                  <StatusBadge status={candidate.status} />
                  <PriorityBadge level={candidate.priorityLevel} />
                </View>
              </View>
              <ActionButton label="Link to existing case" icon="git-merge" onPress={() => void finishDuplicateChoice('link')} loading={busy} />
              <ActionButton label="Create a new case" icon="plus" variant="outline" onPress={() => void finishDuplicateChoice('new')} disabled={busy} />
              <Text style={[styles.manualHint, { color: c.mutedForeground }]}>Similar reports stay connected to the same municipal response.</Text>
            </CivicCard>
          ) : null}

          {submittedCase ? (
            <CivicCard style={styles.successCard}>
              <View style={styles.successHeader}>
                <View style={[styles.successIcon, { backgroundColor: `${c.success}1A` }]}>
                  <Feather name={analysis?.duplicateScore && analysis.duplicateScore >= 68 ? 'git-merge' : 'check'} size={19} color={c.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Eyebrow>REPORT RECEIVED</Eyebrow>
                  <Text style={[styles.gpsCardTitle, { color: c.foreground, marginTop: 5 }]}>
                    {analysis?.duplicateScore && analysis.duplicateScore >= 68 ? 'Added to the existing case' : 'Civic Case created'}
                  </Text>
                </View>
                <StatusBadge status={submittedCase.status} />
              </View>
              <Text style={[styles.caseNumber, { color: c.cyan }]}>{submittedCase.caseNumber}</Text>
              <Text style={[styles.caseTitle, { color: c.foreground }]}>{submittedCase.title}</Text>
              <Text style={[styles.cameraCopy, { color: c.mutedForeground }]}>
                Routed to {submittedCase.department}. You’ll receive updates as the municipal team works on it.
              </Text>
              <ActionButton label="Track this case" icon="arrow-right" onPress={() => router.push(`/cases/${submittedCase.id}`)} />
              <ActionButton label="Report another issue" icon="plus" variant="outline" onPress={() => {
                setEvidence(null); setCandidate(null); setAnalysis(null); setSubmittedCase(null); setTitle(''); setDescription(''); setAddress(''); setVoiceTranscript('');
                setVoiceUri(null);
              }} />
            </CivicCard>
          ) : null}

          {!submittedCase && !candidate ? (
            <ActionButton label="Analyze and submit report" icon="arrow-right" onPress={() => void analyzeAndSubmit()} loading={busy} disabled={!evidence} style={styles.submitButton} testID="submit-report" />
          ) : null}
          <Text style={[styles.privacyNote, { color: c.mutedForeground }]}>
            Your evidence and live location are attached to this report. Sensitive cases have restricted identity access.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SmallField({
  label,
  placeholder,
  keyboardType,
  value,
  onChangeText,
}: {
  label: string;
  placeholder: string;
  keyboardType: 'decimal-pad';
  value: string;
  onChangeText: (value: string) => void;
}) {
  const c = useColors();
  return (
    <View style={{ flex: 1 }}>
      <Text style={[styles.fieldLabel, { color: c.secondaryForeground }]}>{label}</Text>
      <TextInput
        keyboardType={keyboardType}
        value={value}
        placeholder={placeholder}
        placeholderTextColor={c.mutedForeground}
        onChangeText={onChangeText}
        style={[styles.input, { color: c.foreground, backgroundColor: c.surface, borderColor: c.border }]}
      />
    </View>
  );
}

function updateManualLocation(
  latitudeText: string,
  longitudeText: string,
  setLocation: React.Dispatch<React.SetStateAction<GPSPoint | null>>,
) {
  const latitude = Number(latitudeText);
  const longitude = Number(longitudeText);
  if (
    latitudeText.trim() &&
    longitudeText.trim() &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  ) {
    setLocation({ latitude, longitude, accuracy: null });
  } else {
    setLocation(null);
  }
}

function AnalysisMetric({ label, value }: { label: string; value: string }) {
  const c = useColors();
  return (
    <View style={styles.analysisMetric}>
      <Text style={[styles.analysisLabel, { color: c.mutedForeground }]}>{label}</Text>
      <Text style={[styles.analysisValue, { color: c.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 13, gap: 19, maxWidth: 640, width: '100%', alignSelf: 'center' },
  pageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  closeButton: { width: 40, height: 40, borderWidth: 1, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  cameraFrame: { height: 256, borderWidth: 1, borderRadius: 20, overflow: 'hidden', justifyContent: 'center' },
  cameraFallback: { alignItems: 'center', padding: 24, gap: 9 },
  cameraMark: { width: 51, height: 51, alignItems: 'center', justifyContent: 'center', borderRadius: 17 },
  cameraTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold', marginTop: 3 },
  cameraCopy: { fontSize: 11, lineHeight: 17, fontFamily: 'Inter_400Regular' },
  cameraTopControls: { position: 'absolute', top: 11, right: 11, flexDirection: 'row', gap: 8 },
  cameraControl: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#071521B8', justifyContent: 'center', alignItems: 'center' },
  photoTag: { position: 'absolute', left: 11, top: 11, backgroundColor: '#071521B8', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 6 },
  photoTagText: { color: '#FFFFFF', fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  photoActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  captureButton: { width: 53, height: 53, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  removePhoto: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 14 },
  locationBlock: { gap: 10 },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  blockTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  gpsState: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 100, paddingHorizontal: 10, paddingVertical: 7 },
  gpsDot: { width: 6, height: 6, borderRadius: 3 },
  gpsStateText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  gpsCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  gpsCardTitle: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  coordinateText: { fontSize: 10, fontFamily: 'Inter_500Medium' },
  tryAgain: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 },
  tryAgainText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  locationButtons: { flexDirection: 'row', gap: 9 },
  manualFields: { gap: 8 },
  coordRow: { flexDirection: 'row', gap: 9 },
  manualHint: { fontSize: 10, lineHeight: 15, fontFamily: 'Inter_400Regular' },
  fields: { gap: 12 },
  input: { minHeight: 49, borderWidth: 1, borderRadius: 13, paddingHorizontal: 13, paddingVertical: 12, fontSize: 13, fontFamily: 'Inter_400Regular' },
  multiline: { minHeight: 100 },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  autoLabel: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  categoryList: { gap: 7, paddingRight: 18 },
  categoryChip: { borderRadius: 100, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1 },
  categoryText: { fontSize: 10, fontFamily: 'Inter_500Medium' },
  voiceCard: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12 },
  voiceIcon: { width: 35, height: 35, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  recordButton: { width: 37, height: 37, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  analysisCard: { gap: 13 },
  analysisRow: { flexDirection: 'row', gap: 13 },
  analysisMetric: { flex: 1, gap: 4 },
  analysisLabel: { fontSize: 10, fontFamily: 'Inter_500Medium' },
  analysisValue: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  candidateCard: { gap: 14 },
  candidateTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  candidateIcon: { width: 38, height: 38, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  matchCard: { borderWidth: 1, borderRadius: 15, padding: 13, gap: 9 },
  matchScore: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  caseNumber: { fontSize: 11, letterSpacing: 0.6, fontFamily: 'Inter_700Bold' },
  caseTitle: { fontSize: 14, lineHeight: 19, fontFamily: 'Inter_600SemiBold' },
  caseFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  successCard: { gap: 13 },
  successHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  successIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 13 },
  submitButton: { marginTop: 2 },
  privacyNote: { textAlign: 'center', fontSize: 10, lineHeight: 15, paddingHorizontal: 9, fontFamily: 'Inter_400Regular' },
});