/**
 * @format
 */

import {AppRegistry} from 'react-native';
import {name as appName} from './app.json';
import App from './App';
import {PluginManager, EventType} from 'sn-plugin-lib';
import {LOG} from './src/constants';
import {onScribblePenUp} from './src/logic/scribble';

AppRegistry.registerComponent(appName, () => App);

PluginManager.init();
console.log(`${LOG} PluginManager.init() called`);

// Scribble is gesture-driven, not button-driven: it reacts to the drawing
// gesture itself. Register a PEN_UP listener (registerType 1 = normal ordering);
// the lib mutates the payload elements in place via transformElements, so each
// drawn element carries a uuid-keyed points accessor for classification.
PluginManager.registerEventListener(EventType.PEN_UP, 1, {
  onMsg: data => {
    onScribblePenUp(data);
  },
});
console.log(`${LOG} PEN_UP listener registered`);
