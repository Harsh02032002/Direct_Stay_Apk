import { Text, TextInput } from 'react-native';
import { registerRootComponent } from 'expo';
import App from './App';

// Cap system font scaling so enlarged Android display/font settings never clip badges, buttons, or pills
if ((Text as any).defaultProps == null) {
  (Text as any).defaultProps = {};
}
(Text as any).defaultProps.maxFontSizeMultiplier = 1.1;

if ((TextInput as any).defaultProps == null) {
  (TextInput as any).defaultProps = {};
}
(TextInput as any).defaultProps.maxFontSizeMultiplier = 1.1;

registerRootComponent(App);
