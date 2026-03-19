import React, { useEffect, useRef } from 'react';
import { Animated, Image, StatusBar, StyleSheet } from 'react-native';

interface Props {
  onReady: () => void;
}

export function LoadingScreen({ onReady }: Props) {
  const shieldOpacity = useRef(new Animated.Value(0)).current;
  const shieldScale = useRef(new Animated.Value(0.8)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // Icon appears with spring effect
      Animated.parallel([
        Animated.timing(shieldOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(shieldScale, {
          toValue: 1,
          tension: 80,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      // Hold for a moment
      Animated.delay(800),
      // Fade out
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start(() => onReady());
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />
      {/* Tweakly Logo - large, centered */}
      <Animated.View
        style={{
          opacity: shieldOpacity,
          transform: [{ scale: shieldScale }],
          alignItems: 'center',
        }}
      >
        <Image
          source={require('@/assets/images/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 220,
    height: 220,
  },
});
