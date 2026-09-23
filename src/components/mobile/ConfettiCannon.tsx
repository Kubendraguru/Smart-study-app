import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Easing } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CONFETTI_COLORS = [
  '#2563EB', // Blue
  '#3B82F6', // Light blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#FBBF24', // Gold
];

interface Particle {
  id: number;
  color: string;
  size: number;
  shape: 'rect' | 'circle';
  startX: number;
  endX: number;
  anim: Animated.Value;
  rotAnim: Animated.Value;
}

interface ConfettiCannonProps {
  count?: number;
  duration?: number;
}

export default function ConfettiCannon({ count = 36, duration = 3200 }: ConfettiCannonProps) {
  const particlesRef = useRef<Particle[]>([]);

  if (particlesRef.current.length === 0) {
    const arr: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const startX = SCREEN_WIDTH * 0.5 + (Math.random() * 80 - 40);
      const endX = Math.random() * SCREEN_WIDTH;
      const size = Math.random() * 8 + 6;
      const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      const shape = Math.random() > 0.4 ? 'rect' : 'circle';

      arr.push({
        id: i,
        color,
        size,
        shape,
        startX,
        endX,
        anim: new Animated.Value(0),
        rotAnim: new Animated.Value(0),
      });
    }
    particlesRef.current = arr;
  }

  useEffect(() => {
    const animations = particlesRef.current.map((p, idx) => {
      const delay = (idx % 12) * 60;
      return Animated.parallel([
        Animated.timing(p.anim, {
          toValue: 1,
          duration: duration + Math.random() * 600,
          delay,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(p.rotAnim, {
          toValue: 1,
          duration: duration,
          delay,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]);
    });

    Animated.stagger(25, animations).start();
  }, [duration]);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {particlesRef.current.map((p) => {
        const translateY = p.anim.interpolate({
          inputRange: [0, 0.2, 1],
          outputRange: [-30, SCREEN_HEIGHT * 0.25, SCREEN_HEIGHT * 1.1],
        });

        const translateX = p.anim.interpolate({
          inputRange: [0, 1],
          outputRange: [p.startX, p.endX],
        });

        const opacity = p.anim.interpolate({
          inputRange: [0, 0.1, 0.8, 1],
          outputRange: [0, 1, 0.9, 0],
        });

        const rotate = p.rotAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', `${(p.id % 2 === 0 ? 1 : -1) * (360 + p.id * 30)}deg`],
        });

        const scale = p.anim.interpolate({
          inputRange: [0, 0.15, 0.85, 1],
          outputRange: [0.4, 1.1, 1, 0.5],
        });

        return (
          <Animated.View
            key={p.id}
            style={[
              styles.particle,
              {
                width: p.size,
                height: p.shape === 'rect' ? p.size * 1.6 : p.size,
                backgroundColor: p.color,
                borderRadius: p.shape === 'circle' ? p.size / 2 : 2,
                opacity,
                transform: [{ translateX }, { translateY }, { rotate }, { scale }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
