// Device location service → window.CMLocation
//
// getDeviceLocation() is the single entry point the UI uses. It currently
// returns a hardcoded position because macOS never answers Electron's
// geolocation request in dev (Electron.app has no NSLocationUsageDescription,
// so CoreLocation never prompts and the request times out).
//
// Future methods to plug in here:
//   - fromBrowser(): navigator.geolocation (works once the packaged app
//     declares NSLocationUsageDescription / location permission)
//   - fromIP():      IP-based lookup via an external service
//   - fromSaved():   last location stored in casaMonarca.db

(function () {
  // 25°39′05″N 100°17′26″O
  const FAKE_LOCATION = {
    lat: 25 + 39 / 60 + 5 / 3600,      //  25.651389
    lng: -(100 + 17 / 60 + 26 / 3600), // -100.290556
    accuracy: 0,
  };

  // Returns Promise<{ lat, lng, accuracy, timestamp, source }>
  async function getDeviceLocation() {
    return fakeLocation();
  }

  async function fakeLocation() {
    return { ...FAKE_LOCATION, timestamp: new Date().toISOString(), source: "fake" };
  }

  window.CMLocation = { getDeviceLocation };
})();
