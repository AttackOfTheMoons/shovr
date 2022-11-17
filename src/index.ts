/* CSC-495 Virtual Reality Virtual Locomotion, Fall 2022
 * Author: Regis Kopper
 *
 * Based on
 * CSC 5619, Fall 2020
 * Author: Evan Suma Rosenberg
 * 
 * License: Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
 */ 

import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3, Color3, Space } from "@babylonjs/core/Maths/math";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { WebXRControllerComponent } from "@babylonjs/core/XR/motionController/webXRControllercomponent";
import { WebXRInputSource } from "@babylonjs/core/XR/webXRInputSource";
import { WebXRCamera } from "@babylonjs/core/XR/webXRCamera";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { Logger } from "@babylonjs/core/Misc/logger";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import {MeshBuilder} from  "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { LinesMesh } from "@babylonjs/core/Meshes/linesMesh";
import { Ray } from "@babylonjs/core/Culling/ray";
import { Axis } from "@babylonjs/core/Maths/math.axis";
import { Quaternion } from "@babylonjs/core/Maths/math.vector";


// Side effects
import "@babylonjs/core/Helpers/sceneHelpers";
import "@babylonjs/inspector";
import '@babylonjs/core/Debug/debugLayer';

import '@babylonjs/loaders/glTF/2.0/glTFLoader';
import '@babylonjs/loaders/STL/stlFileLoader';
import '@babylonjs/loaders/OBJ/objFileLoader';
import { AssetsManager } from "@babylonjs/core/Misc/assetsManager";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { PointerInfo, PointerEventTypes, Mesh } from "@babylonjs/core";

enum LocomotionMode
{
    viewDirected,
    handDirected,
    teleportation
}

class Game 
{ 
    private canvas: HTMLCanvasElement;
    private engine: Engine;
    private scene: Scene;

    private xrCamera: WebXRCamera | null; 
    private leftController: WebXRInputSource | null;
    private rightController: WebXRInputSource | null;

    private locomotionMode: LocomotionMode;
    private laserPointer: LinesMesh | null;
    private groundMeshes: Array<AbstractMesh>;
    private teleportPoint: Vector3 | null;

    constructor()
    {
        // Get the canvas element 
        this.canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

        // Generate the BABYLON 3D engine
        this.engine = new Engine(this.canvas, true); 

        // Creates a basic Babylon Scene object
        this.scene = new Scene(this.engine);   

        this.xrCamera = null;
        this.leftController = null;
        this.rightController = null;

        this.laserPointer = null;
        this.groundMeshes = Array<AbstractMesh>();
        this.teleportPoint = null;
        this.locomotionMode = LocomotionMode.viewDirected;
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
            window.addEventListener("resize", () => { 
                this.engine.resize();
            });
        });
    }

    private async createScene() 
    {
        // This creates and positions a first-person camera (non-mesh)
        const camera = new UniversalCamera("camera1", new Vector3(0, 1.6, 0), this.scene);
        camera.fov = 90 * Math.PI / 180;
        camera.minZ = .1;
        camera.maxZ = 100;

        // This attaches the camera to the canvas
        camera.attachControl(this.canvas, true);

       // Create a point light
       const pointLight = new PointLight("pointLight", new Vector3(0, 2.5, 0), this.scene);
       pointLight.intensity = 1.0;
       pointLight.diffuse = new Color3(.25, .25, .25);

        // Creates a default skybox
        const environment = this.scene.createDefaultEnvironment({
            createGround: true,
            groundSize: 100,
            skyboxSize: 50,
            skyboxColor: new Color3(0, 0, 0)
        });

        // Make sure the skybox is not pickable!
        environment!.skybox!.isPickable = false;

        this.groundMeshes.push(environment!.ground!);

        // Creates the XR experience helper
        const xrHelper = await this.scene.createDefaultXRExperienceAsync({});

        // Assigns the web XR camera to a member variable
        this.xrCamera = xrHelper.baseExperience.camera;

        // Remove default teleportation and pointer selection
        xrHelper.teleportation.dispose();
        xrHelper.pointerSelection.dispose();

        // Create points for the laser pointer
        
        this.scene.debugLayer.show();

        const assetsManager = new AssetsManager(this.scene);

        const rollingChair = assetsManager.addMeshTask('rollingchairTask', ['bottom frame', 'leather', 'leggy', 'metal frame'], 'assets/', 'uploads_files_3104459_office+chair.glb');
        rollingChair.onSuccess = (task) => {
            task.loadedMeshes[0].name = 'Rolling Chair';
            task.loadedMeshes[0].scaling = new Vector3(1.5,1.5,1.5);
        }

        const room = new TransformNode('lab room');
        room.scaling = new Vector3(0.05, 0.05, 0.05);
        room.rotation = new Vector3(Math.PI / 2, 0, 0);
        const roomTask = assetsManager.addMeshTask('roomTask', null, 'assets/', 'lab.glb');
        roomTask.onSuccess = (task) => {
            task.loadedMeshes.forEach((mesh, index) => {
                mesh.parent = room;
            });
            task.loadedMeshes[2].dispose();
        }

        this.scene.onPointerObservable.add((pointerInfo) => {
            // this.processPointer(pointerInfo);
        });

        assetsManager.load();
    }

    private processPointer(pointerInfo: PointerInfo)
    {
        switch (pointerInfo.type) {
        case PointerEventTypes.POINTERDOWN:
            if (pointerInfo.pickInfo?.hit) {
                if (pointerInfo.pickInfo.pickedMesh !== null) {
                    console.log(pointerInfo.pickInfo.pickedMesh.name);
                    pointerInfo.pickInfo.pickedMesh.isVisible = false;
                }
            }
            break;
        }
    }

    // The main update loop will be executed once per frame before the scene is rendered
    private update() : void
    {
        // Polling for controller input
        this.processControllerInput();
    }

    // Process event handlers for controller input
    private processControllerInput() : void
    {
        // this.onRightA(this.rightController?.motionController?.getComponent("a-button"));
        // this.onRightThumbstick(this.rightController?.motionController?.getComponent("xr-standard-thumbstick"));
    }

    /**
private onRightA(component?: WebXRControllerComponent) {
        if (component?.changes.pressed?.current)
        {
            this.locomotionMode = this.locomotionMode + 1 % 3;
            Logger.Log("LocomotionMode changed");
        }
    }

    private onRightThumbstick(component?: WebXRControllerComponent)
    {
        if(component?.changes.axes)
        {
            if (this.locomotionMode == LocomotionMode.viewDirected) {
                const directionVector = this.xrCamera!.getDirection(Vector3.Forward());

                const moveDistance = -component.axes.y * (this.engine.getDeltaTime() / 1000) * 3;

                this.xrCamera!.position.addInPlace(directionVector.scale(moveDistance));

                const turnAngle = component.axes.x * (this.engine.getDeltaTime() / 1000) * 6;
                const cameraRotation = Quaternion.FromEulerAngles(0, turnAngle * Math.PI / 180, 0);
                this.xrCamera!.rotationQuaternion.multiplyInPlace(cameraRotation);
            }
            if (this.locomotionMode == LocomotionMode.handDirected) {
                const directionVector = this.rightController!.pointer.forward;

                const moveDistance = -component.axes.y * (this.engine.getDeltaTime() / 1000) * 3;

                this.xrCamera!.position.addInPlace(directionVector.scale(moveDistance));

                const turnAngle = component.axes.x * (this.engine.getDeltaTime() / 1000) * 6;
                const cameraRotation = Quaternion.FromEulerAngles(0, turnAngle * Math.PI / 180, 0);
                this.xrCamera!.rotationQuaternion.multiplyInPlace(cameraRotation);
            }
        }
    }*/

}
/******* End of the Game class ******/   

// start the game
const game = new Game();
game.start();