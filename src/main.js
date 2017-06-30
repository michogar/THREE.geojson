import BuildingShape from '.'

const root = 1 / 2.5
const heightFn = (val) => (Math.pow(parseFloat(val), root))

const conf = {
  useHeight: true,
  heightAttr: 'EW_HA2013',
  heightFn: heightFn,
  root: root,
  max: heightFn(900),
  z_max: 500.0,
  z_rel: 0.01,
  offset_x: -45,
  offset_y: 59,
  offset_z: 0,
  r: 0,
  scale_x: 209,
  scale_y: 350,
  scale_factor: 0.1,
  heightScaler: 0.5,
  animateHeight: false,
  //the system doesn't really have a spatial projection structure
  //so we simply translate the latitude/longitude values into simple x/y coordinates
  translateLat: (lat) => {
    if (!lat) {
      lat = 0
    }
    return (lat - 13.36) * 100
  },
  translateLng: (lng) => {
    if (!lng) {
      lng = 0
    }
    return (lng - 52.53) * 100
  }
}

const getJson = async (url) => (
  await (await fetch(url)).json()
)

const url = './data/einwohnerdichte2013_mini.geojson'
getJson(url)
  .then(jsonFile => new BuildingShape(conf, jsonFile))
//  .catch(reason => {throw new Error(reason.message)})




