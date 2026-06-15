/**
 * @format
 */

import {AppRegistry, Image} from 'react-native';
import {name as appName} from './app.json';
import App from './App';
import {handleMainAction} from './src/index';
import {PluginManager} from 'sn-plugin-lib';
import {LOG, PLUGIN_BUTTON_NAME, PLUGIN_MENU_ID} from './src/constants';

AppRegistry.registerComponent(appName, () => App);

PluginManager.init();
console.log(`${LOG} PluginManager.init() called`);

// type 2 = lasso menu.
PluginManager.registerButton(2, ['NOTE'], {
  id: PLUGIN_MENU_ID,
  name: PLUGIN_BUTTON_NAME,
  icon: Image.resolveAssetSource(require('./assets/icon.png')).uri,
  // Selection element types that enable the button: 0=stroke, 1=title,
  // 2=image, 3=text-box, 4=link, 5=geometry. Trim this list to the types the
  // plugin actually acts on — but if any selection should ever be
  // geometry-only, 5 must be included or the button greys out even though
  // geometry is otherwise serializable.
  editDataTypes: [0, 1, 2, 3, 4, 5],
  showType: 0,
}).then(
  res => console.log(`${LOG} registerButton resolved:`, res),
  err => console.log(`${LOG} registerButton rejected:`, err),
);

PluginManager.registerButtonListener({
  onButtonPress: event => {
    console.log(
      `${LOG} onButtonPress fired. event=${JSON.stringify(event)} ` +
        `expected id=${PLUGIN_MENU_ID} name=${PLUGIN_BUTTON_NAME}`,
    );
    if (event?.id === PLUGIN_MENU_ID && event?.name === PLUGIN_BUTTON_NAME) {
      console.log(`${LOG} match -> calling handleMainAction`);
      handleMainAction();
    } else {
      console.log(`${LOG} event did not match expected id/name, ignoring`);
    }
  },
});
console.log(`${LOG} registerButtonListener called`);

// For gesture-driven live updates (e.g. drag-to-resize), register a motion
// listener here — see SDK_DOC.md for the motion-listener pattern (DOWN/UP
// correlation with element rects, "read before dismiss", etc.).
