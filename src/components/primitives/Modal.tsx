import { Ionicons } from '@expo/vector-icons';
import {
  KeyboardAvoidingView,
  Modal as RNModal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from './Text';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /**
   * 'adaptive' (default): bottom sheet on phones, centred dialog on wide screens.
   * 'sheet' | 'dialog' force one presentation.
   */
  presentation?: 'adaptive' | 'sheet' | 'dialog';
}

/**
 * Universal modal: a bottom sheet on small screens, a centred dialog on
 * desktop web — per the responsive requirement to avoid mobile-only
 * interactions where a dialog is more appropriate.
 */
export function Modal({ visible, onClose, title, children, presentation = 'adaptive' }: ModalProps) {
  const { colors } = useTheme();
  const { isWide } = useBreakpoint();
  const insets = useSafeAreaInsets();

  const asDialog = presentation === 'dialog' || (presentation === 'adaptive' && isWide);

  return (
    <RNModal visible={visible} transparent animationType={asDialog ? 'fade' : 'slide'} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.backdropWrap, asDialog ? styles.center : styles.bottom]}
      >
        <Pressable
          accessibilityLabel="Close"
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
          onPress={onClose}
        />
        <View
          accessibilityViewIsModal
          style={[
            styles.panel,
            asDialog ? styles.dialog : [styles.sheet, { paddingBottom: insets.bottom + spacing.lg }],
            { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
          ]}
        >
          {!asDialog && <View style={[styles.grabber, { backgroundColor: colors.borderStrong }]} />}
          <View style={styles.header}>
            {title ? (
              <Text variant="title3" style={styles.headerTitle}>
                {title}
              </Text>
            ) : (
              <View style={styles.headerTitle} />
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              hitSlop={8}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView
            bounces={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}
            style={styles.scroll}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </RNModal>
  );
}

/** Bottom-sheet-only presentation shorthand. */
export function BottomSheet(props: Omit<ModalProps, 'presentation'>) {
  return <Modal {...props} presentation="sheet" />;
}

const styles = StyleSheet.create({
  backdropWrap: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['2xl'],
  },
  bottom: {
    justifyContent: 'flex-end',
  },
  panel: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  dialog: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '85%',
    borderRadius: radius.lg,
  },
  sheet: {
    width: '100%',
    maxHeight: '88%',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: radius.full,
    marginTop: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  headerTitle: {
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flexGrow: 0,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
});
