import {
  GreatVibes_400Regular,
  useFonts,
} from '@expo-google-fonts/great-vibes';
import {
  Image,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

import { colors } from '@/constants/theme';

type BrandMarkProps = {
  compact?: boolean;
  showTagline?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function BrandMark({
  compact = false,
  showTagline = !compact,
  style,
}: BrandMarkProps) {
  const [fontsLoaded] = useFonts({ GreatVibes_400Regular });

  return (
    <View style={[styles.wrap, compact && styles.compact, style]}>
      <Image
        source={require('../assets/images/logo.png')}
        style={[styles.logo, compact && styles.logoCompact]}
        resizeMode="cover"
        accessibilityLabel="Candle Love logo"
      />

      <Text
        style={[
          styles.title,
          compact && styles.titleCompact,
          fontsLoaded && styles.scriptFont,
        ]}
      >
        Candle Love
      </Text>

      {showTagline ? (
        <Text style={styles.tagline}>Light a candle. Find real love.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginVertical: 6,
  },
  compact: {
    alignItems: 'flex-start',
    marginVertical: 0,
  },
  logo: {
    width: 86,
    height: 86,
    borderRadius: 18,
    marginBottom: 2,
  },
  logoCompact: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  title: {
    color: colors.goldBright,
    fontFamily: 'serif',
    fontSize: 48,
    lineHeight: 60,
    textAlign: 'center',
  },
  titleCompact: {
    fontSize: 30,
    lineHeight: 38,
  },
  scriptFont: {
    fontFamily: 'GreatVibes_400Regular',
  },
  tagline: {
    color: colors.muted,
    fontSize: 13,
    marginTop: -4,
  },
});
