import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { Screen } from '@/components/Screen';
import { AppButton } from '@/components/AppButton';
import { colors, radius } from '@/constants/theme';
import { api } from '@/services/api';
import { appConfig } from '@/services/config';

export default function VoiceIntroScreen() {
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, directory: 'document' });
  const state = useAudioRecorderState(recorder);
  const [uri, setUri] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) setNotice('Microphone permission is required for a Voice Candle.');
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    })().catch(() => setNotice('Microphone setup failed.'));
  }, []);

  const start = async () => { setNotice(''); await recorder.prepareToRecordAsync(); recorder.record(); };
  const stop = async () => { await recorder.stop(); setUri(recorder.uri ?? null); setNotice('Recording ready. Keep it warm and under 20 seconds.'); };
  const upload = async () => {
    if (!uri || busy) return; setBusy(true); setNotice('');
    try {
      if (!appConfig.demoMode) {
        const form = new FormData();
        form.append('audio', { uri, name: 'voice-candle.m4a', type: 'audio/mp4' } as never);
        await api('/intentional/voice-intro', { method: 'POST', body: form });
      }
      setNotice('Your Voice Candle is now part of your profile.');
    } catch { setNotice('The recording could not be uploaded. Try again.'); }
    finally { setBusy(false); }
  };

  return <Screen><Text style={styles.title}>Voice Candle</Text><Text style={styles.copy}>Record a short answer to: “What does real love mean to you?” Your voice helps people feel your warmth before the first message.</Text><View style={styles.card}><Text style={styles.timer}>{Math.round((state.durationMillis ?? 0) / 1000)}s / 20s</Text><Text style={styles.status}>{state.isRecording ? 'Recording…' : uri ? 'Ready to upload' : 'Tap start when you feel ready'}</Text><AppButton title={state.isRecording ? 'Stop recording' : 'Start recording'} kind={state.isRecording ? 'danger' : 'primary'} onPress={state.isRecording ? stop : start}/>{uri ? <AppButton title="Upload Voice Candle" kind="secondary" loading={busy} onPress={upload}/> : null}</View>{notice ? <Text style={styles.notice}>{notice}</Text> : null}</Screen>;
}
const styles = StyleSheet.create({ title: { color: colors.text, fontSize: 28, fontWeight: '900' }, copy: { color: colors.muted, lineHeight: 21 }, card: { alignItems: 'center', gap: 14, padding: 22, borderRadius: radius.lg, backgroundColor: '#21140B', borderWidth: 1, borderColor: colors.goldDark }, timer: { color: colors.goldBright, fontSize: 34, fontWeight: '900' }, status: { color: colors.cream, textAlign: 'center' }, notice: { color: colors.goldBright, textAlign: 'center', lineHeight: 20 } });
