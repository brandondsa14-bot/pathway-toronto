// Smoke tests the browser Routes Library adapter without sending network requests.
// Requires frontend/typescript from the existing development dependencies.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require(path.resolve(__dirname,"../frontend/node_modules/typescript"));
const source = fs.readFileSync(path.resolve(__dirname,"../frontend/app/indoor/streetRoutes.ts"),"utf8");
const compiled = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const m = new Module("streetRoutes.cjs",module);m.filename=path.resolve(__dirname,"streetRoutes.cjs");m.paths=module.paths;m._compile(compiled,m.filename);
const {parseGoogleWalkingRoute,computeStreetWalkingRoute,googleMapsWalkingLink}=m.exports;
const sample={
  path:[{lat:43.65,lng:-79.38},{lat:43.651,lng:-79.379}],distanceMeters:160,durationMillis:110000,
  legs:[{steps:[{instructions:"Turn right onto a surveyed STREET pedestrian segment",maneuver:"TURN_RIGHT",
    localizedValues:{distance:"160 m",staticDuration:"2 min"},path:[{lat:43.65,lng:-79.38},{lat:43.651,lng:-79.379}]}]}],warnings:[],
};
(async()=>{
  const parsed=parseGoogleWalkingRoute(sample);
  assert.equal(parsed.source,"GOOGLE_STREET_WALKING");
  assert.equal(parsed.steps[0].instruction,sample.legs[0].steps[0].instructions);
  assert.equal(parsed.path.length,2);
  assert.equal(parsed.distanceMeters,160);
  assert.match(googleMapsWalkingLink({lat:43.65,lng:-79.38},"Nathan Phillips Square"),/travelmode=walking/);
  let request;
  global.window={google:{maps:{importLibrary:async name=>{
    assert.equal(name,"routes");return {Route:{computeRoutes:async r=>{request=r;return {routes:[sample]};}}};
  }}}};
  const route=await computeStreetWalkingRoute({lat:43.65,lng:-79.38},{lat:43.651,lng:-79.379});
  assert.equal(request.travelMode,"WALKING");
  assert.equal(request.routeModifiers.avoidIndoor,true);
  assert.deepEqual(request.fields.includes("legs"),true);
  assert.equal(route.steps.length,1);
  assert.throws(()=>parseGoogleWalkingRoute({path:[]}),/drawable/);
  console.log("PASS: route adapter tests (geometry, provider steps, no invented path, link and WALKING request)");
})().catch(e=>{console.error(e);process.exitCode=1;});
