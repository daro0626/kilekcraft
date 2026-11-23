import { createBlockTitle } from './blocktitle-draw.js';

let renderer;
self.onmessage = ({ data }) => {
  if (data.canvas) {
    renderer = createBlockTitle(data.canvas, data.text, data.colors, false);
    return;
  }
  renderer[data.method](...data.args);
};
