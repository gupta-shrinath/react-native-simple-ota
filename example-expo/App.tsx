import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { applyOTAIfApplicable, rollbackToDefaultBundle } from 'react-native-simple-ota';

export default function App() {
  useEffect(()=>{
    applyOTAIfApplicable()
  },[])
  return (
    <View style={styles.container}>
      <Text>Default bundle Loaded</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
