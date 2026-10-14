import { useRef, useState } from 'react';
import { Alert, Platform, StyleSheet, View, type TextInput } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Camera, User, UserList } from 'phosphor-react-native';
import { Blob } from '@/components/art/Brand';
import { Button } from '@/components/ui/Button';
import { Field, Screen, StepHeader, Title } from '@/components/ui/Layout';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { api, ApiError } from '@/api';
import { nextOnboardingRoute, useSession } from '@/store/session';
import { color, space } from '@/theme/tokens';

export default function Profile() {
  const me = useSession((s) => s.me);
  const setSession = useSession((s) => s.set);
  const [first, setFirst] = useState(me?.first_name ?? '');
  const [last, setLast] = useState(me?.last_name ?? '');
  const [photo, setPhoto] = useState<string | null>(me?.photo_url ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastRef = useRef<TextInput>(null);
  const ok = first.trim().length >= 2;

  const pick = async (from: 'camera' | 'library') => {
    const perm = from === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(from === 'camera' ? 'Camera is off' : 'Photos are off', 'You can turn access on in Settings, or skip the photo for now.');
      return;
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 };
    const res = from === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (!res.canceled && res.assets[0]) setPhoto(res.assets[0].uri);
  };

  const choosePhoto = () =>
    Platform.OS === 'web' ? pick('library') : Alert.alert('Profile photo', 'Runners see this when they come to you.', [
      { text: 'Take a photo', onPress: () => pick('camera') },
      { text: 'Choose from photos', onPress: () => pick('library') },
      ...(photo ? [{ text: 'Remove photo', style: 'destructive' as const, onPress: () => setPhoto(null) }] : []),
      { text: 'Cancel', style: 'cancel' as const },
    ]);

  const submit = async () => {
    if (!ok) { setError('Add at least 2 letters.'); return; }
    setLoading(true);
    try {
      const clean = (v: string) => v.trim().replace(/\s+/g, ' ').replace(/^./, (c) => c.toUpperCase());
      let updated = await api.updateMe({ first_name: clean(first), last_name: last.trim() ? clean(last) : null });
      if (photo && photo !== me?.photo_url) { await api.uploadPhoto(photo); updated = { ...updated, photo_url: photo }; }
      setSession({ me: updated });
      router.push(nextOnboardingRoute(useSession.getState()) as never);
    } catch (e) {
      Alert.alert('Couldn’t save your name', e instanceof ApiError ? e.message : 'Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen header={<StepHeader step={2} />} footer={<Button label="Continue" onPress={submit} loading={loading} disabled={!ok} />}>
      <Title lede="Runners and requesters see your first name and photo. Nothing else.">What should people call you?</Title>

      <View style={{ alignItems: 'center', marginBottom: space[6] }}>
        <PressableScale onPress={choosePhoto} style={s.photo} accessibilityLabel={photo ? 'Change profile photo' : 'Add a profile photo, optional'}>
          {photo ? <Image source={{ uri: photo }} style={s.img} contentFit="cover" /> : <Blob size={86} />}
          <View style={s.cam}><Camera size={18} weight="bold" color={color.white} /></View>
        </PressableScale>
        <Text variant="caption" tone="ink3" style={{ marginTop: space[2] }}>{photo ? 'Looking good. Tap to change it.' : 'Add a photo (optional)'}</Text>
      </View>

      <View style={{ gap: space[5] }}>
        <Field
          label="First name"
          icon={<User size={18} weight="duotone" color={color.ink2} />}
          value={first}
          onChangeText={(t) => { setFirst(t); if (error) setError(null); }}
          placeholder="e.g. Adaeze"
          autoComplete="given-name"
          textContentType="givenName"
          autoCapitalize="words"
          returnKeyType="next"
          onSubmitEditing={() => lastRef.current?.focus()}
          error={error}
        />
        <Field
          ref={lastRef}
          label="Last name"
          optional
          icon={<UserList size={18} weight="duotone" color={color.ink2} />}
          value={last}
          onChangeText={setLast}
          placeholder="e.g. Okafor"
          autoComplete="family-name"
          textContentType="familyName"
          autoCapitalize="words"
          returnKeyType="done"
          onSubmitEditing={submit}
          hint="Only used on receipts."
        />
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  photo: { width: 112, height: 112, borderRadius: 56, backgroundColor: color.tangerineSoft, alignItems: 'center', justifyContent: 'center' },
  img: { width: 112, height: 112, borderRadius: 56 },
  cam: { position: 'absolute', right: 0, bottom: 4, width: 38, height: 38, borderRadius: 19, backgroundColor: color.midnight, borderWidth: 3, borderColor: color.paper, alignItems: 'center', justifyContent: 'center' },
});
