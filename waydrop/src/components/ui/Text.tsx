import { Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { color, type, type TypeVariant } from '@/theme/tokens';

type Props = TextProps & { variant?: TypeVariant; tone?: keyof typeof color; align?: TextStyle['textAlign'] };

/** All app text goes through here so the scale, colours and font-scaling limits stay consistent. */
export function Text({ variant = 'body', tone = 'midnight', align, style, ...rest }: Props) {
  const { maxScale, ...t } = type[variant];
  return (
    <RNText
      maxFontSizeMultiplier={maxScale}
      style={[t, { color: color[tone], textAlign: align }, style]}
      {...rest}
    />
  );
}
