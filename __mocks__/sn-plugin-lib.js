// Jest mock for the native plugin lib so pure logic (geometry/detect) can be
// unit-tested in Node. Only the symbols the tested modules import need to exist.
module.exports = {
  PointUtils: {
    emrPoint2Android: (p) => ({ x: p.x, y: p.y }),
  },
};
