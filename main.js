import * as THREE from 'three';
import { Tween, Group, Easing } from "@tweenjs/tween.js";
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import { GLTFLoader } from 'three/examples/jsm/Addons.js';


const app = document.querySelector('#app');
const loader = new GLTFLoader();
const group = new Group();

/* set up renderer*/
const renderer = new THREE.WebGLRenderer({antialiasing:true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);

/* set up raycaster */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

/* setup scene */
const scene = new THREE.Scene();
const axesHelper = new THREE.AxesHelper(10);
scene.add(axesHelper);

/* setup camera*/
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 1000);
camera.position.set(3,-3,2.5);
camera.up = new THREE.Vector3(0,0,1);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0,0,1);
controls.maxDistance = 50;
controls.minDistance = 1;
controls.maxPolarAngle = Math.PI / 2;
controls.enableDamping = true;
controls.update();

/* load .glb file */

loader.load( 'models/proto.glb', function ( gltf ) {
    let office = gltf.scene;
    // office.rotateX(Math.PI / 2)
    office.traverse( (object) => {
        if(object.isMesh) {
            object.receiveShadow = true;
            object.castShadow = true;
            console.log(object.name);
            if(object.name.includes("target")) {

            }
        }
    })
    scene.add(office);
    console.log(office);
} );  


/* add box */
const boxGeo = new THREE.BoxGeometry(.2,.2,.2);
let material = new THREE.MeshPhysicalMaterial({color: 0xffff00})
let cube = new THREE.Mesh(boxGeo, material);
cube.position.z = 2;
cube.castShadow = true;
cube.name = "cube";

scene.add(cube);
controls.target.set(cube.position.x, cube.position.y, cube.position.z);


/* add lights */
const dlight = new THREE.DirectionalLight(0xffffff);
dlight.castShadow = true;
dlight.position.set(1,0,10);
dlight.target = cube;

//Set up shadow properties for the light
dlight.shadow.mapSize.width = 512*8; // default
dlight.shadow.mapSize.height = 512*8; // default
dlight.shadow.camera.near = 0.5; // default
dlight.shadow.camera.far = 500; // default
dlight.shadow.focus = 1; // default
scene.add(dlight);

const dlHelper = new THREE.DirectionalLightHelper(dlight);
scene.add(dlHelper);

const alight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(alight);


function windowResizeHandler() {
    renderer.setSize(window.innerWidth, window.innerHeight); 
    camera.updateProjectionMatrix();
}

function mouseClickHandler (event) {
    
    pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
    raycaster.setFromCamera( pointer, camera );

    let intersects = raycaster.intersectObjects( scene.children );

    if(intersects.length) {
        let poc = intersects[0];
        let newPosition;
        let newTarget;
        if(poc.object.name.includes("seat") ) {
            newPosition = intersects[0].object;
            newTarget = scene.getObjectByName(poc.object.name.replace("seat","target"));
            const coords = {x: camera.position.x, y: camera.position.y, z: camera.position.z};
            const tween = new Tween(coords)
            .to({ x: newPosition.position.x, y: newPosition.position.y, z: newPosition.position.z + 2.5})
            .onUpdate(() => {
                camera.position.set(coords.x, coords.y, coords.z);
                // camera.up = new THREE.Vector3(0,0,1);
                // camera.lookAt(newTarget.position);
                controls.target.set(newTarget.position.x, newTarget.position.y, newTarget.position.z)
                }
            )
            .easing(Easing.Quadratic.InOut)
            // .onComplete( () => {
            //     camera.up = new THREE.Vector3(0,0,1);
            //     camera.lookAt(newTarget.position);
            // })
            .start();
            group.add(tween);
        }

        console.log({newPosition, newTarget});
        
        
    }
}

function pointerMoveHandler (event) {
    // console.log(event)
    pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
    raycaster.setFromCamera( pointer, camera );

    let intersects = raycaster.intersectObjects( scene.children );

    if(intersects.length) {
        if(intersects[0].object.name.includes("seat")) {
            app.classList.add('show-pointer');
        } else {
            app.classList.remove('show-pointer')
        }
    }
}

function animate(time) {
    requestAnimationFrame(animate);
    group.update(time);
    controls.update();
    renderer.render(scene, camera);
}

animate();
window.addEventListener('click', mouseClickHandler);
window.addEventListener('mousemove', pointerMoveHandler);
window.addEventListener('resize', windowResizeHandler);