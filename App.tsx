/**
 * Busy overlay — shown via PluginManager.showPluginView() while a slow
 * operation runs, hidden with closePluginView() when it finishes. Static (no
 * animated spinner — e-ink doesn't refresh smoothly enough for one to look
 * good).
 *
 * The backdrop is transparent (e-ink doesn't alpha-blend, so any tint fills the
 * whole surface solid white and blanks the canvas). Only the small card draws,
 * centered, so the page stays visible around it.
 *
 * @format
 */

import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

function App(): React.JSX.Element {
  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <Text style={styles.title}>Scribble</Text>
        <Text style={styles.sub}>Working…</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#ffffff',
  },
  title: {fontSize: 18, fontWeight: '700', color: '#000000'},
  sub: {marginLeft: 10, fontSize: 15, color: '#000000'},
});

export default App;
