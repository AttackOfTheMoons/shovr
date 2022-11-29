/* CSC-495 Virtual Reality Virtual Locomotion, Fall 2022
 * Author: Regis Kopper
 *
 * Based on
 * CSC 5619, Fall 2020
 * Author: Evan Suma Rosenberg
 * 
 * License: Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
 */ 

import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3, Color3, Vector4 } from '@babylonjs/core/Maths/math';
import { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
import { WebXRInputSource } from '@babylonjs/core/XR/webXRInputSource';
import { WebXRCamera } from '@babylonjs/core/XR/webXRCamera';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { MeshBuilder } from  '@babylonjs/core/Meshes/meshBuilder';



// Side effects
import '@babylonjs/core/Helpers/sceneHelpers';
import '@babylonjs/inspector';
import '@babylonjs/core/Debug/debugLayer';

import '@babylonjs/loaders/glTF/2.0/glTFLoader';
// import '@babylonjs/loaders/STL/stlFileLoader';
// import '@babylonjs/loaders/OBJ/objFileLoader';
import { AssetsManager } from '@babylonjs/core/Misc/assetsManager';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { WebXRControllerComponent } from '@babylonjs/core/XR/motionController/webXRControllerComponent';
import { HighlightLayer } from '@babylonjs/core/Layers/highlightLayer';


class Game 
{ 
    private canvas: HTMLCanvasElement;
    private engine: Engine;
    private scene: Scene;

    private xrCamera: WebXRCamera | null; 
    private leftController: WebXRInputSource | null;
    private rightController: WebXRInputSource | null;

    private shovel: Mesh | null;
    private rollingChair: AbstractMesh | null;
    private floor: AbstractMesh | null;
    private previousPos: Vector3 | null;
    private previousRot: Vector3 | null;

    private highlightLayer: HighlightLayer | null;

    private moveInDirection: Vector4;
    
    private wallMeshes: Array<Mesh>;

    private rChair : TransformNode | null;

    constructor()
    {
        // Get the canvas element 
        this.canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;

        // Generate the BABYLON 3D engine
        this.engine = new Engine(this.canvas, true); 

        // Creates a basic Babylon Scene object
        this.scene = new Scene(this.engine);   

        this.xrCamera = null;
        this.leftController = null;
        this.rightController = null;

        this.shovel = null;
        this.rollingChair = null;
        this.floor = null;
        this.previousPos = null;
        this.previousRot = null;
        this.moveInDirection = Vector4.Zero();

        this.highlightLayer = null;
        this.wallMeshes = [];

        this.rChair = null;
    }

    start() : void 
    {
        // Create the scene and then execute this function afterwards
        this.createScene().then(() => {

            // Register a render loop to repeatedly render the scene
            this.engine.runRenderLoop(() => { 
                this.update();
                this.scene.render();
            });

            // Watch for browser/canvas resize events
            window.addEventListener('resize', () => { 
                this.engine.resize();
            });
        });
    }

    private async createScene() 
    {
        // This creates and positions a first-person camera (non-mesh)
        const camera = new UniversalCamera('camera1', new Vector3(0, 1.6, 0), this.scene);
        camera.fov = 90 * Math.PI / 180;
        camera.minZ = .1;
        camera.maxZ = 100;

        // This attaches the camera to the canvas
        camera.attachControl(this.canvas, true);

        // camera.position = new Vector3(10,11.6,10);

       // Create a point light
       const pointLight = new PointLight('pointLight', new Vector3(0, 2.5, 0), this.scene);
       pointLight.intensity = 1.0;
       pointLight.diffuse = new Color3(.25, .25, .25);

        // Creates a default skybox
        const environment = this.scene.createDefaultEnvironment({
            createGround: true,
            groundSize: 100,
            skyboxSize: 100000,
            skyboxColor: new Color3(0, 0, 0)
        });

        // Make sure the skybox is not pickable!
        environment!.skybox!.isPickable = false;

        // Creates the XR experience helper
        const xrHelper = await this.scene.createDefaultXRExperienceAsync({});

        // Assigns the web XR camera to a member variable
        this.xrCamera = xrHelper.baseExperience.camera;

        // Remove default teleportation and pointer selection
        xrHelper.teleportation.dispose();
        xrHelper.pointerSelection.dispose();

        // Create points for the laser pointer
        
        // this.scene.enablePhysics(new Vector3(0, 0, 0), new CannonJSPlugin(undefined, undefined, Cannon));
        this.scene.debugLayer.show();
        // let root = new TransformNode("root", this.scene);

        const assetsManager = new AssetsManager(this.scene);
        this.rChair = new TransformNode('chair parent', this.scene);
        const rollingChair = assetsManager.addMeshTask('rollingchairTask', ['bottom frame', 'leather', 'leggy', 'metal frame'], 'assets/', 'uploads_files_3104459_office+chair.glb');
        rollingChair.onSuccess = (task) => {
            task.loadedMeshes[0].name = 'Rolling Chair';
            task.loadedMeshes[0].scaling = new Vector3(1.85,1.85,1.85);
            task.loadedMeshes[0].rotation = Vector3.Zero();
            task.loadedMeshes[0].position = new Vector3(.5, -.25, .7); 
            // task.loadedMeshes[0].physicsImpostor = new PhysicsImpostor(task.loadedMeshes[0], PhysicsImpostor.BoxImpostor, {mass: 1}, this.scene);
            this.rollingChair = task.loadedMeshes[0];
            this.rollingChair.parent = this.rChair;
        };
        this.rChair.rotation.y = Math.PI / 6;
        // SceneLoader.ImportMesh("", "./assets/", "pipe.glb", this.scene, (meshes) => {

        //     meshes[0].name = "pipe";
        //     meshes[0].scaling = new Vector3(2, 2, 2);
        //     meshes[0].rotation = new Vector3(0, Math.PI, 0);
        //     meshes[0].position.y = 12;
        //     meshes[0].position.x = 10;
        //     meshes[0].position.z = 1;
        //     meshes[0].parent = root;

        //     let cannonMaterial = <StandardMaterial>meshes[0].material;
        //     cannonMaterial.emissiveColor = new Color3(1, 1, 1);
        // });

        const room = new TransformNode('lab room');
        room.scaling = Vector3.One().scale(.03);
        room.rotation = new Vector3(Math.PI / 2, 0, 0);
        const roomTask = assetsManager.addMeshTask('roomTask', null, 'assets/', 'lab.glb');

        roomTask.onSuccess = (task) => {
            task.loadedMeshes.forEach((mesh) => {
                mesh.parent = room;
                if (mesh.name === '3d-model_primitive0') {
                    mesh.dispose();
                } else if (mesh.name === '3d-model_primitive23') {
                    mesh.name = 'lab floor';
                    this.floor = mesh;
                }
            });
        };
        
        // const shovelTask = assetsManager.addMeshTask("shovelTask", null, "assets/", "shovel.obj");

        // shovelTask.onSuccess = (task) => {
        //     task.loadedMeshes[0].name = "shovel";
        // }

        const shovelStandIn = MeshBuilder.CreateCylinder('shovelStandIn', {height: 1.25, diameter: .05}, this.scene);
        shovelStandIn.position = new Vector3(0, 1.6, 0.2);
        shovelStandIn.rotation.z = Math.PI / 2;

        this.shovel = shovelStandIn;

        this.highlightLayer = new HighlightLayer('highlighted', this.scene);
        
        
        //Assigns controllers
        xrHelper.input.onControllerAddedObservable.add((inputSource) => {
            inputSource.onMeshLoadedObservable.addOnce(() => {

            if(inputSource.uniqueId.endsWith('left')) 
            {
                this.leftController = inputSource;
            }
            else 
            {
                this.rightController = inputSource;
            }
            });
        });

        const frontColliderMesh = MeshBuilder.CreateBox('frontCollide', {width: 10, depth: 1, height: 2}, this.scene);
        frontColliderMesh.position = new Vector3(0, .14, 3.8);
        frontColliderMesh.isVisible = false;
        this.wallMeshes.push(frontColliderMesh);

        assetsManager.load();
    }    

    // The main update loop will be executed once per frame before the scene is rendered
    private update() : void
    {
        // Polling for controller input
        this.processControllerInput();
        this.glide();
    }

    private glide() : void
    {
        if (this.moveInDirection.equals(Vector4.Zero())) {
            return;
        }
        else if (this.moveInDirection.w < this.scene.deltaTime / 1000) {
            // this.moveInDirection = Vector4.Zero();
            return;
        }
        else if (Math.max(Math.abs(this.moveInDirection.x), Math.abs(this.moveInDirection.y), Math.abs(this.moveInDirection.z)) < .000001 ) {
            return;
        }
        // console.log('moveDir', this.moveInDirection, 'time passed', time);
        const impulse = this.moveInDirection.toVector3().scale(this.scene.deltaTime / 1000);
        this.moveInDirection.w = Math.max(this.moveInDirection.w - this.scene.deltaTime / 1000, 0);
        console.log('trying to move: ', this.moveInDirection);
        if (this.rollingChair && this.xrCamera && this.rightController?.grip && this.rChair) {
            const prevPoss = [this.rChair!.position, this.xrCamera!.position, this.rightController!.grip!.position];
            this.rChair.position.addInPlace(impulse);        
            this.xrCamera.position.addInPlace(impulse);
            this.rightController.grip.position.addInPlace(impulse);
            console.log('gliding!', impulse);
            this.wallMeshes.forEach((mesh) => {
                if (mesh.intersectsMesh(this.rollingChair!)) {
                    this.moveInDirection.scaleInPlace(-.5);
                    this.moveInDirection.w = .2;
                    [this.rChair!.position, this.xrCamera!.position, this.rightController!.grip!.position] = prevPoss;
                    console.log('hit wall!');
                }
            });
        }
    }

    // Process event handlers for controller input
    private processControllerInput() : void
    {
        // this.onRightA(this.rightController?.motionController?.getComponent("a-button"));
        this.onRightThumbstick(this.rightController?.motionController?.getComponent('xr-standard-thumbstick'));
        this.onSqueeze(this.rightController?.motionController?.getComponent('xr-standard-squeeze'));
    }

    private onSqueeze(component: WebXRControllerComponent | undefined) : void 
    {
        if (component === undefined) {
            return;
        }
        if (!this.rightController || !this.rightController.grip) {
            return;
        }
        if (component?.changes.pressed?.current) {
            if (this.shovel?.intersectsMesh(this.rightController.grip)) {
                this.shovel.setParent(this.rightController.grip);
                this.shovel.position = new Vector3(0, -.38, -.42);
                this.shovel.rotation = new Vector3(8.3, -80.39, -49.5).scale(Math.PI / 180);
            }
        }
        else if (!component.pressed) {
            this.shovel?.setParent(null);
            this.previousPos = null;
            this.previousRot = null;
            if (this.shovel) 
            {
                this.highlightLayer?.removeMesh(this.shovel);
            }
        }
        else if (component.pressed) {
            if (this.shovel?.parent && this.floor?.intersectsMesh(this.shovel) && this.rChair && this.xrCamera && this.rightController?.grip)
            {
                //feedback for hitting the floor.
                this.highlightLayer?.addMesh(this.shovel, Color3.Green());
                if (this.previousPos === null) {
                    this.previousPos = this.rightController.grip.position.clone();
                    this.previousRot = this.rightController.grip.rotation.clone(); // using tangent for rotation when solving.
                } else {
                    const impulse = this.previousPos.subtract(this.rightController.grip.position);
                    // console.log('prevPos', this.previousPos, 'currPos', this.rightController.grip.position);
                    if (impulse.x >= 0 && impulse.x <= .001 && impulse.z >= 0 && impulse.z <= .001) {
                        return;
                    }
                    if (impulse.x <= 0 && impulse.x >= -.001 && impulse.z <= 0 && impulse.z >= .001) {
                        return;
                    }
                    //make sure not to go too high or too low.
                    impulse.y = 0; // Math.min(Math.abs(impulse.y), .01) * Math.pow(-1, +(impulse.y < 0));
                    // const rot = this.previousRot?.subtract(this.rightController.grip.rotation)
                    const t = impulse.scale(this.scene.deltaTime / 1000 * 500);
                    t.x = Math.sqrt(Math.abs(t.x)) * (t.x < 0 ? -1 : 1);
                    t.z = Math.sqrt(Math.abs(t.z)) * (t.z < 0 ? -1 : 1);
                    console.log('moveindirection1 increment', t);
                    this.moveInDirection.addInPlace(Vector4.FromVector3(t, this.scene.deltaTime / 1000 * 3));
                    this.rChair.position.addInPlace(impulse);
                    let rot = Math.atan(impulse.x/impulse.z);
                    if (rot === 0 && impulse.z < 0) {
                        rot = Math.PI;
                    }
                    this.rChair.rotation.y = Math.PI / 6 + rot;
                    this.xrCamera.position.addInPlace(impulse);
                    this.rightController.grip.position.addInPlace(impulse);
                    // console.log('rotate', rot);
                    // console.log('pushing chair', impulse);
                    this.previousPos = this.rightController.grip.position.clone();
                    this.previousRot = this.rightController.grip.rotation.clone();
                    
                }
            }
            else {
                this.previousPos = null;
                this.previousRot = null;
                if (this.shovel) 
                {
                    this.highlightLayer?.removeMesh(this.shovel);
                }
            }
        }
        
    }
    private onRightThumbstick(component?: WebXRControllerComponent)
    {
        if(component?.changes.axes)
        {
            if (this.shovel?.parent) {
                if (component.axes.y > 0)
                {
                    this.shovel.position = new Vector3(0, -.38, -.42);
                }
                else if (component.axes.y < 0) { 
                    this.shovel.position = new Vector3(0, .36, .47);
                }
            }
        }
    }

   
}
/******* End of the Game class ******/   

// start the game
const game = new Game();
game.start();
