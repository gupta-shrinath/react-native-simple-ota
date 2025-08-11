import { Text, View, StyleSheet, Button } from 'react-native';
import {
  applyOTAIfApplicable,
  rollbackToDefaultBundle,
} from 'react-native-simple-ota';
import { useEffect } from 'react';

export default function App() {
  useEffect(() => {
    applyOTAIfApplicable();
  }, []);

  return (
    <View style={styles.container}>
      {/* <Text>New Bundle Loaded!</Text> */}
      <Text>Default Bundle Loaded</Text>
      {/* <Button title='Rollback' onPress={
        () => {
          rollbackToDefaultBundle()
        }
      } /> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
