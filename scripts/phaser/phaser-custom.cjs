/**
 * Kafa Kafaya için özel Phaser derlemesi (Faz 7, paket boyutu).
 *
 * Tam `phaser` paketi oyunun hiç kullanmadığı sistemleri de taşır: Matter.js ve Arcade fiziği,
 * tilemap'ler, parçacıklar, ses yöneticisi (sesler kendi Web Audio motorumuzda), BitmapText,
 * Mesh, Video, Spine, çoğu şekil ve dosya türü… Bu giriş `phaser/src/phaser-core.js` üzerine
 * kuruludur ve yalnızca oyunun kullandığı ek nesneleri (Container, TileSprite, Zone, Rectangle,
 * Arc), `Display.Color` ve `Geom.Rectangle`'ı ekler. Yalnızca üretim derlemesinde `phaser`
 * içe aktarımının yerine geçer (vite.config.ts); geliştirme sunucusu tam paketi kullanır.
 * Özellik bayrakları (`typeof WEBGL_RENDERER` …) `flags.ts` eklentisiyle sabitlenir.
 *
 * Yeni bir Phaser nesnesi/fabrikası kullanılırsa buraya eklenmelidir (uçtan uca testler eksik
 * modülü çalışma zamanı hatası olarak yakalar).
 */
require('phaser/src/polyfills/requestVideoFrame');

var CONST = require('phaser/src/const');
var Extend = require('phaser/src/utils/object/Extend');

// Fabrikalar yüklenince `scene.add.*` üzerine kaydolur.
require('phaser/src/gameobjects/graphics/GraphicsFactory');
require('phaser/src/gameobjects/image/ImageFactory');
require('phaser/src/gameobjects/text/TextFactory');
require('phaser/src/gameobjects/container/ContainerFactory');
require('phaser/src/gameobjects/tilesprite/TileSpriteFactory');
require('phaser/src/gameobjects/zone/ZoneFactory');
require('phaser/src/gameobjects/shape/rectangle/RectangleFactory');
require('phaser/src/gameobjects/shape/arc/ArcFactory');
// `scene.make.*` (ekran dışı çizim: ikon dokuları `make.graphics` ile üretilir).
require('phaser/src/gameobjects/graphics/GraphicsCreator');

var Phaser = {
  Animations: require('phaser/src/animations'),
  BlendModes: require('phaser/src/renderer/BlendModes'),
  Cache: require('phaser/src/cache'),
  Cameras: { Scene2D: require('phaser/src/cameras/2d') },
  Core: require('phaser/src/core'),
  Class: require('phaser/src/utils/Class'),
  Data: require('phaser/src/data'),
  Display: {
    Masks: require('phaser/src/display/mask'),
    Color: require('phaser/src/display/color'),
  },
  DOM: require('phaser/src/dom'),
  Events: require('phaser/src/events'),
  FX: require('phaser/src/fx'),
  Game: require('phaser/src/core/Game'),
  GameObjects: {
    DisplayList: require('phaser/src/gameobjects/DisplayList'),
    GameObjectCreator: require('phaser/src/gameobjects/GameObjectCreator'),
    GameObjectFactory: require('phaser/src/gameobjects/GameObjectFactory'),
    UpdateList: require('phaser/src/gameobjects/UpdateList'),
    Components: require('phaser/src/gameobjects/components'),
    GetCalcMatrix: require('phaser/src/gameobjects/GetCalcMatrix'),
    BuildGameObject: require('phaser/src/gameobjects/BuildGameObject'),
    GameObject: require('phaser/src/gameobjects/GameObject'),
    Graphics: require('phaser/src/gameobjects/graphics/Graphics'),
    Image: require('phaser/src/gameobjects/image/Image'),
    Text: require('phaser/src/gameobjects/text/Text'),
    Container: require('phaser/src/gameobjects/container/Container'),
    TileSprite: require('phaser/src/gameobjects/tilesprite/TileSprite'),
    Zone: require('phaser/src/gameobjects/zone/Zone'),
    Shape: require('phaser/src/gameobjects/shape/Shape'),
    Rectangle: require('phaser/src/gameobjects/shape/rectangle/Rectangle'),
    Arc: require('phaser/src/gameobjects/shape/arc/Arc'),
  },
  Geom: { Rectangle: require('phaser/src/geom/rectangle') },
  Input: require('phaser/src/input'),
  Math: {
    Between: require('phaser/src/math/Between'),
    DegToRad: require('phaser/src/math/DegToRad'),
    FloatBetween: require('phaser/src/math/FloatBetween'),
    Linear: require('phaser/src/math/Linear'),
    RadToDeg: require('phaser/src/math/RadToDeg'),
    Vector2: require('phaser/src/math/Vector2'),
  },
  Plugins: require('phaser/src/plugins'),
  Renderer: require('phaser/src/renderer'),
  Scale: require('phaser/src/scale'),
  ScaleModes: require('phaser/src/renderer/ScaleModes'),
  Scene: require('phaser/src/scene/Scene'),
  Scenes: require('phaser/src/scene'),
  Structs: require('phaser/src/structs'),
  Textures: require('phaser/src/textures'),
  Time: require('phaser/src/time'),
  Tweens: require('phaser/src/tweens'),
};

module.exports = Extend(false, Phaser, CONST);
