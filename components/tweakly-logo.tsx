import { Palette } from '@/constants/theme';
import React from 'react';
import { Image, ImageRequireSource, Text, View } from 'react-native';

const LOGO_SOURCE: ImageRequireSource = require('@/assets/images/icon.png');

// Full logo with shield + "Tweakly" text (for use where space allows)
interface LogoImageProps {
  height?: number;
  lightText?: boolean;
}
export function TweaklyLogo({ height = 28 }: LogoImageProps) {
  return <Image source={LOGO_SOURCE} style={{ width: height, height }} resizeMode="contain" />;
}

// Shield only — uses the real PNG logo
interface ShieldProps {
  size?: number;
}
export function TweaklyShield({ size = 40 }: ShieldProps) {
  return (
    <Image
      source={LOGO_SOURCE}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
}

// Wordmark "Tweakly"
interface WordmarkProps {
  size?: number;
  lightText?: boolean;
}
export function TweaklyWordmark({ size = 32, lightText = false }: WordmarkProps) {
  const textColor = lightText ? '#FFFFFF' : '#000000';
  return (
    <Text style={{ fontSize: size, fontWeight: '800', letterSpacing: 0.3 }}>
      <Text style={{ color: textColor }}>Tweak</Text>
      <Text style={{ color: Palette.primary, fontStyle: 'italic' }}>ly</Text>
    </Text>
  );
}
