import { createScene } from './voxel-scene.js';

let scene;
self.onmessage = ({ data }) => {
  switch (data.type) {
    case 'init':
      scene = createScene(data.canvas, data.options, data.ratio);
      self.postMessage('ready');
      break;
    case 'build': scene.load(data.build); break;
    case 'layer': scene.setLayer(data.layer); break;
    case 'resize': scene.resize(data.width, data.height); break;
    case 'frame':
      scene.draw(data.frame);
      self.postMessage('drawn');
      break;
  }
};
