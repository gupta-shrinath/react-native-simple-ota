import { AppRegistry } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';
import { init } from 'react-native-simple-ota';
import MyOtaUpdateProvider from './src/MyOtaUpdateProvider';

init(new MyOtaUpdateProvider());

AppRegistry.registerComponent(appName, () => App);
