/* Web Worker: loads model in background thread */
importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.20.0/dist/tf.min.js');

var model = null;

self.onmessage = async function(e) {
  var data = e.data;

  if (data.cmd === 'load') {
    try {
      self.postMessage({ type: 'status', msg: 'Downloading model...' });
      model = await tf.loadLayersModel(data.url);
      self.postMessage({ type: 'status', msg: 'Model loaded! Warming up...' });
      var dummy = tf.zeros([1, 224, 224, 3]);
      var out = model.predict(dummy);
      out.dispose();
      dummy.dispose();
      self.postMessage({ type: 'ready', msg: 'Model ready' });
    } catch(err) {
      self.postMessage({ type: 'error', msg: err.message });
    }
  }

  if (data.cmd === 'predict') {
    if (!model) {
      self.postMessage({ type: 'error', msg: 'Model not loaded' });
      return;
    }
    try {
      var input = tf.tensor(data.pixels, [1, 224, 224, 3], 'float32');
      var sc = tf.tensor1d(data.scale).reshape([1,1,1,3]);
      var off = tf.tensor1d(data.offset).reshape([1,1,1,3]);
      input = input.mul(sc).add(off);
      var output = model.predict(input);
      var result = output.dataSync()[0];
      input.dispose(); output.dispose(); sc.dispose(); off.dispose();
      self.postMessage({ type: 'result', id: data.id, value: result });
    } catch(err) {
      self.postMessage({ type: 'error', id: data.id, msg: err.message });
    }
  }
};
