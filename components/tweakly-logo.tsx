import React from 'react';
import { View, Text, Image, ImageRequireSource } from 'react-native';
import { Palette } from '@/constants/theme';

// Full logo (shield + "Tweakly" text next to each other)
// Use this in the header (top left).
interface LogoImageProps {
  height?: number;
  lightText?: boolean;
}
export function TweaklyLogo({ height = 28, lightText = false }: LogoImageProps) {
  // Use the Tweakers logo
  const logoSource: ImageRequireSource = require('@/assets/images/tweakers_logo_1-removebg-preview (6).png');
  const width = Math.round(height * 2);
  return <Image source={logoSource} style={{ width, height }} resizeMode="contain" />;
}

// Shield only (for loading screen)
interface ShieldProps {
  size?: number;
}
export function TweaklyShield({ size = 40 }: ShieldProps) {
  const w = Math.round(size * 0.76);
  const bodyH = Math.round(size * 0.68);
  const pointH = Math.round(size * 0.32);
  const radius = Math.round(w * 0.22);

  return (
    <View style={{ width: w, height: bodyH + pointH, alignItems: 'center' }}>
      <View
        style={{
          width: w,
          height: bodyH,
          backgroundColor: Palette.primaryDark,
          borderTopLeftRadius: radius,
          borderTopRightRadius: radius,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: Math.round(size * 0.42),
            fontWeight: '900',
            fontStyle: 'italic',
            lineHeight: Math.round(size * 0.52),
          }}
        >
          T
        </Text>
      </View>
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: w / 2,
          borderRightWidth: w / 2,
          borderTopWidth: pointH,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: Palette.primaryDark,
        }}
      />
    </View>
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
