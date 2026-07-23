import { Link, type Href } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  type GestureResponderEvent,
  type MouseEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

export interface LinkPressState {
  pressed: boolean;
  hovered: boolean;
}

export interface LinkPressableProps extends Omit<PressableProps, 'style' | 'children'> {
  href: Href;
  style?: StyleProp<ViewStyle> | ((state: LinkPressState) => StyleProp<ViewStyle>);
  children?: React.ReactNode;
}

/**
 * Link + Pressable, safely.
 *
 * expo-router's `Link asChild` clones its child to merge navigation props and
 * SILENTLY DROPS a function-form `style` (verified: the rendered element gets
 * no style attribute at all). Never pass a style function to a Pressable
 * inside `Link asChild` — use this component instead: it tracks press/hover
 * state itself and always passes the resolved, static style down.
 */
export function LinkPressable({
  href,
  style,
  children,
  onPressIn,
  onPressOut,
  onHoverIn,
  onHoverOut,
  ...rest
}: LinkPressableProps) {
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);

  const resolvedStyle = typeof style === 'function' ? style({ pressed, hovered }) : style;

  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole="link"
        {...rest}
        style={resolvedStyle}
        onPressIn={(event: GestureResponderEvent) => {
          setPressed(true);
          onPressIn?.(event);
        }}
        onPressOut={(event: GestureResponderEvent) => {
          setPressed(false);
          onPressOut?.(event);
        }}
        onHoverIn={(event: MouseEvent) => {
          setHovered(true);
          onHoverIn?.(event);
        }}
        onHoverOut={(event: MouseEvent) => {
          setHovered(false);
          onHoverOut?.(event);
        }}
      >
        {children}
      </Pressable>
    </Link>
  );
}
