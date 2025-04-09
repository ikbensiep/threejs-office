import * as THREE from 'three';
import { Tween, Group, Easing } from "@tweenjs/tween.js";
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import { GLTFLoader } from 'three/examples/jsm/Addons.js';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js'

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const postprocessing = {};

const app = document.querySelector('#app');
const loader = new GLTFLoader();
const tweenGroup = new Group();
const gui = new GUI();
const camFolder = gui.addFolder('Camera settings');
const blurFolder = gui.addFolder('Blur settings');

/* set up renderer*/
const renderer = new THREE.WebGLRenderer({ antialiasing: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.antialiasing = true;
renderer.shadowMap.enabled = true;
// renderer.toneMapping = THREE.ACESFilmicToneMapping;
// renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);

/* set up raycaster */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

/* setup scene */
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x000000, 10, 15);

// const axesHelper = new THREE.AxesHelper(10);
// scene.add(axesHelper);


/* setup camera*/
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(3, -3, 1.5);
camera.up = new THREE.Vector3(0, 0, 1);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 1);
controls.maxDistance = 50;
controls.minDistance = 1;
controls.minPolarAngle = 1;
controls.maxPolarAngle = Math.PI / 2;
controls.enableDamping = true;
controls.update();

camera.fov = 50;
const camControls = {
  get fov() { return camera.fov; },
  set fov(value) {
    camera.fov = value;
    camera.updateProjectionMatrix();

  },
}

camFolder.add(camControls, 'fov', 0, 100);


/* add box */
const boxGeo = new THREE.BoxGeometry(.2, .2, .2);
let material = new THREE.MeshPhysicalMaterial({ color: 0xffff00 })
let cube = new THREE.Mesh(boxGeo, material);
cube.position.z = 2;
cube.castShadow = true;
cube.name = "cube";

scene.add(cube);


/* add lights */
const dlight = new THREE.PointLight(0xffffff, 0, 0, 2);
dlight.castShadow = true;
dlight.position.set(4, 1, 5);
dlight.target = cube;

//Set up shadow properties for the light
dlight.shadow.mapSize.width = 512 * 8; // default
dlight.shadow.mapSize.height = 512 * 8; // default
dlight.shadow.camera.near = 0.5; // default
dlight.shadow.camera.far = 500; // default
dlight.shadow.focus = 1; // default
dlight.shadow.bias = - 0.0001;
scene.add(dlight);

const dlHelper = new THREE.PointLightHelper(dlight, 0)
scene.add(dlHelper);

const alight = new THREE.AmbientLight(0xffffff, 0.1);
scene.add(alight);

const renderPass = new RenderPass(scene, camera);
const bokehSettings = {
  focus: 2,
  aperture: .001,
  maxblur: .01
};

const bokehPass = new BokehPass(scene, camera, bokehSettings);

blurFolder.add(bokehPass.uniforms.focus, 'value', 0, 10, .1); // min, max, step
blurFolder.add(bokehPass.uniforms.aperture, 'value', 0, .005, .0001); // min, max, step
blurFolder.add(bokehPass.uniforms.maxblur, 'value', 0, .1, .01); // min, max, step

const outputPass = new OutputPass();
const composer = new EffectComposer(renderer);

composer.addPass(renderPass);
composer.addPass(bokehPass);
composer.addPass(outputPass);

postprocessing.composer = composer;
postprocessing.bokeh = bokehPass;

/* load .glb file */

loader.load('models/proto-3.glb', function (gltf) {
  let office = gltf.scene;
  office.traverse((object) => {
    if (object.isMesh) {
      object.receiveShadow = true;
      object.castShadow = true;
      if (object.name.includes("target") || object.name.includes("seat")) {
        object.receiveShadow = false;
        object.castShadow = false;
        object.material.opacity = 0;
        console.log(object.name);
      }
    }
    if (object.name.includes("Spot")) {
      object.intensity /= 500;
      object.castShadow = true;
      object.shadow.bias = - 0.0005
    }
  })
  scene.add(office);
  console.log(office);

  const params = {x: 0, y: 0, z: 0};
  const lightTween = new Tween(params, false)
  .to({x:20})
  .onUpdate(()=>{
    dlight.intensity = params.x;
    alight.intensity = params.x / 10;
  })
  .easing(Easing.Quadratic.InOut)
  .duration(2000)
  .start();
  tweenGroup.add(lightTween);
});

function windowResizeHandler() {
  // windowHalfX = window.innerWidth / 2;
  // windowHalfY = window.innerHeight / 2;

  let width = window.innerWidth;
  let height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  postprocessing.composer.setSize(width, height);
}

function mouseClickHandler(event) {

  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = - (event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  let intersects = raycaster.intersectObjects(scene.children);

  if (intersects.length) {
    let poc = intersects[0];
    let newPosition;
    let newTarget;
    if (poc.object.name.includes("seat")) {
      newPosition = poc.object;
      newTarget = scene.getObjectByName(poc.object.name.replace("seat", "target"));

      console.log(poc.object)
      const posCoords = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
      const posTween = new Tween(posCoords)
        .to({ x: newPosition.position.x, y: newPosition.position.y, z: newPosition.position.z + .65 })
        .onUpdate(() => {
          camera.position.set(posCoords.x, posCoords.y, posCoords.z);
          // camera.lookAt(newTarget.position);
          // TODO: make separate tween for controls.target
          // controls.target.set(newTarget.position.x, newTarget.position.y, newTarget.position.z)

        })
        .easing(Easing.Quadratic.InOut)
        .onComplete(() => {
          console.log(`moved to ${poc.object.name}`);
        })
        .duration(2000)
        .start();

      const targetCoords = { ...controls.target };

      const targetTween = new Tween(targetCoords)
        .to({ x: newTarget.position.x, y: newTarget.position.y, z: newTarget.position.z })
        .onUpdate(() => {
          controls.target.set(targetCoords.x, targetCoords.y, targetCoords.z)
        })
        .onComplete(() => {
          console.log(`viewing ${newTarget.name}`);
        })
        .duration(2000)
        .start();
      tweenGroup.add(targetTween);
      tweenGroup.add(posTween);
    }

    console.log({ newPosition, newTarget });


  }
}

function pointerMoveHandler(event) {
  // console.log(event)
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = - (event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  let intersects = raycaster.intersectObjects(scene.children);

  if (intersects.length) {
    if (intersects[0].object.name.includes("seat")) {
      app.classList.add('show-pointer');
    } else {
      app.classList.remove('show-pointer')
    }
  }
}

function animate(time) {
  requestAnimationFrame(animate);
  tweenGroup.update(time);

  controls.update();
  renderer.render(scene, camera);
  postprocessing.composer.render(0.1);
}

animate();

window.addEventListener('click', mouseClickHandler);
window.addEventListener('mousemove', pointerMoveHandler);
window.addEventListener('resize', windowResizeHandler);