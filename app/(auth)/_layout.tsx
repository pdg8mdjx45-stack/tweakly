import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="onboarding" options={{ animation: 'none' }} />
      <Stack.Screen name="inloggen" />
      <Stack.Screen name="registreren" />
      <Stack.Screen name="verificatie" />
      <Stack.Screen name="verify" />
      <Stack.Screen name="wachtwoord-vergeten" />
    </Stack>
  );
}
