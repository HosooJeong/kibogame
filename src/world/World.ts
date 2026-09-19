import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RobotView } from "./RobotView";
import { StopMarker } from "./StopMarker";
import type { GameController } from "../game/controller";
import { sameCell } from "../game/types";

function box(w: number, h: number, d: number, color: string, radius = 0.09) {
  const mesh = new THREE.Mesh(
    new RoundedBoxGeometry(w, h, d, 3, radius),
    new THREE.MeshStandardMaterial({ color, roughness: 0.72 }),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
function starShape() {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const angle = Math.PI / 2 + (i * Math.PI) / 5;
    const radius = i % 2 ? 0.2 : 0.425;
    const x = Math.cos(angle) * radius,
      y = Math.sin(angle) * radius;
    if (!i) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}
function disposeGroup(group: THREE.Object3D) {
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
      obj.geometry.dispose();
      const materials = Array.isArray(obj.material)
        ? obj.material
        : [obj.material];
      materials.forEach((material) => material.dispose());
    }
  });
}

export class World {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100);
  private board = new THREE.Group();
  private robot = new RobotView();
  private stopMarker = new StopMarker();
  private star = new THREE.Group();
  private confetti = new THREE.Group();
  private observer: ResizeObserver;
  private frame = 0;
  private last = 0;
  private time = 0;
  private winAt = -1;
  private stageIndex = -1;
  private disposed = false;
  private reduced = window.matchMedia("(prefers-reduced-motion: reduce)")
    .matches;
  private halfWidth = 1;
  private halfHeight = 1;
  private onContextLost: (event: Event) => void;

  constructor(
    private canvas: HTMLCanvasElement,
    private game: GameController,
    onFail: () => void,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "default",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.scene.background = new THREE.Color("#f8f7f0");
    this.scene.add(new THREE.HemisphereLight("#fffef4", "#b6bfa9", 1.6));
    const sun = new THREE.DirectionalLight("#fff6e0", 2.8);
    sun.position.set(-3, 9, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, {
      left: -8,
      right: 8,
      top: 8,
      bottom: -8,
      near: 0.5,
      far: 25,
    });
    sun.shadow.normalBias = 0.035;
    sun.shadow.bias = -0.00015;
    sun.shadow.radius = 3;
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight("#e2f1ff", 0.8);
    fill.position.set(7, 4, -5);
    this.scene.add(fill);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.ShadowMaterial({ color: "#8c9177", opacity: 0.19 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.4;
    ground.receiveShadow = true;
    this.scene.add(ground);
    // The child looks straight over the robot's shoulder: north is screen-up.
    this.camera.position.set(0, 12, 12);
    this.camera.lookAt(0, 0, 0);
    this.scene.add(this.board, this.robot.root, this.confetti, this.stopMarker.root);
    this.stopMarker.badge.quaternion.copy(this.camera.quaternion);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
    this.onContextLost = (event) => {
      event.preventDefault();
      cancelAnimationFrame(this.frame);
      onFail();
    };
    canvas.addEventListener("webglcontextlost", this.onContextLost);
    this.rebuild();
    this.resize();
    this.frame = requestAnimationFrame(this.loop);
  }
  private rebuild() {
    disposeGroup(this.board);
    this.board.clear();
    const stage = this.game.stage,
      offset = (stage.size - 1) / 2;
    this.stageIndex = this.game.getSnapshot().stageIndex;
    this.winAt = -1;
    const plinth = box(
      stage.size + 0.22,
      0.26,
      stage.size + 0.22,
      "#c6d8ca",
      0.13,
    );
    plinth.position.y = -0.235;
    this.board.add(plinth);
    for (let y = 0; y < stage.size; y++)
      for (let x = 0; x < stage.size; x++) {
        const cell = { x, y };
        const blocked = stage.obstacles.some((p) => sameCell(p, cell));
        const trail = stage.trail?.some((p) => sameCell(p, cell));
        const goal = sameCell(cell, stage.goal);
        const tile = box(
          0.947,
          0.18,
          0.947,
          goal
            ? "#f5dda0"
            : trail
              ? "#b6dcd0"
              : (x + y) % 3 === 0
                ? "#f5f2e4"
                : "#e9e9dc",
          0.075,
        );
        tile.position.set(x - offset, 0, y - offset);
        this.board.add(tile);
        if (blocked) {
          const height = 0.39 + ((x * 3 + y) % 3) * 0.045;
          const block = box(
            0.77,
            height,
            0.77,
            ["#dfb99f", "#c5d3dc", "#d3c9ae"][(x + y) % 3],
            0.1,
          );
          block.position.set(x - offset, 0.105 + height / 2, y - offset);
          this.board.add(block);
          const stud = new THREE.Mesh(
            new THREE.CylinderGeometry(0.115, 0.115, 0.045, 20),
            new THREE.MeshStandardMaterial({
              color: "#f4e6d2",
              roughness: 0.8,
            }),
          );
          stud.position.set(x - offset, 0.135 + height, y - offset);
          stud.castShadow = true;
          this.board.add(stud);
        } else if (trail && !goal && !sameCell(cell, stage.start)) {
          const dot = new THREE.Mesh(
            new THREE.CircleGeometry(0.055, 16),
            new THREE.MeshBasicMaterial({ color: "#76ad98" }),
          );
          dot.rotation.x = -Math.PI / 2;
          dot.position.set(x - offset, 0.095, y - offset);
          this.board.add(dot);
        }
        if (sameCell(cell, stage.start)) {
          const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.26, 0.285, 40),
            new THREE.MeshBasicMaterial({
              color: "#619c8e",
              side: THREE.DoubleSide,
            }),
          );
          ring.rotation.x = -Math.PI / 2;
          ring.position.set(x - offset, 0.096, y - offset);
          this.board.add(ring);
        }
      }
    this.star = new THREE.Group();
    const gem = new THREE.Mesh(
      new THREE.ExtrudeGeometry(starShape(), {
        depth: 0.14,
        bevelEnabled: true,
        bevelSegments: 3,
        steps: 1,
        bevelSize: 0.035,
        bevelThickness: 0.035,
      }),
      new THREE.MeshStandardMaterial({
        color: "#f5bc3e",
        roughness: 0.3,
        metalness: 0.3,
      }),
    );
    gem.position.z = -0.07;
    gem.castShadow = true;
    this.star.add(gem);
    this.star.position.set(stage.goal.x - offset, 0.75, stage.goal.y - offset);
    this.board.add(this.star);
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.29, 0.33, 48),
      new THREE.MeshBasicMaterial({ color: "#cf9e40", side: THREE.DoubleSide }),
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.set(stage.goal.x - offset, 0.102, stage.goal.y - offset);
    this.board.add(halo);
    this.resize();
  }
  private resize() {
    const { width, height } = this.canvas.getBoundingClientRect();
    if (!width || !height) return;
    this.renderer.setSize(width, height, false);
    this.camera.updateMatrixWorld();
    const extent = this.game.stage.size / 2 + 0.3;
    let xMax = 0,
      yMax = 0;
    for (const x of [-extent, extent])
      for (const y of [-0.4, 2.05])
        for (const z of [-extent, extent]) {
          const p = new THREE.Vector3(x, y, z).applyMatrix4(
            this.camera.matrixWorldInverse,
          );
          xMax = Math.max(xMax, Math.abs(p.x));
          yMax = Math.max(yMax, Math.abs(p.y));
        }
    const aspect = width / height;
    this.halfHeight = Math.max(yMax * 1.01, (xMax * 1.01) / aspect);
    this.halfWidth = this.halfHeight * aspect;
    Object.assign(this.camera, {
      left: -this.halfWidth,
      right: this.halfWidth,
      top: this.halfHeight,
      bottom: -this.halfHeight,
    });
    this.camera.updateProjectionMatrix();
  }
  private burst() {
    disposeGroup(this.confetti);
    this.confetti.clear();
    for (let i = 0; i < 22; i++) {
      const bit = box(
        0.065,
        0.035,
        0.1,
        ["#e9b945", "#76b5a1", "#dcae92", "#93bdce"][i % 4],
        0.01,
      );
      bit.userData = {
        angle: i * 2.399,
        speed: 0.8 + (i % 4) * 0.2,
        lift: 1.4 + (i % 3) * 0.3,
      };
      this.confetti.add(bit);
    }
  }
  private render(ms: number) {
    this.time += ms / 1000;
    this.game.tick(ms);
    const state = this.game.getSnapshot();
    if (this.stageIndex !== state.stageIndex) this.rebuild();
    const offset = (this.game.stage.size - 1) / 2;
    const motion = this.game.motion;
    let x = state.pose.x,
      z = state.pose.y,
      angle = Math.PI - (state.pose.direction * Math.PI) / 2;
    this.robot.rig.position.set(0, 0, 0);
    this.robot.rig.rotation.set(0, 0, 0);
    this.robot.rig.scale.set(1, 1, 1);
    let progress = 0;
    if (motion) {
      progress = motion.elapsed / motion.duration;
      const ease = progress * progress * (3 - 2 * progress);
      angle = Math.PI - (motion.from.direction * Math.PI) / 2;
      if (motion.blocked) {
        this.robot.rig.rotation.z = this.reduced
          ? 0
          : Math.sin(progress * Math.PI * 6) *
            0.11 *
            Math.sin(progress * Math.PI);
      } else if (motion.command === "left" || motion.command === "right") {
        angle += (((motion.command === "left" ? 1 : -1) * Math.PI) / 2) * ease;
      } else {
        x = THREE.MathUtils.lerp(motion.from.x, motion.to.x, ease);
        z = THREE.MathUtils.lerp(motion.from.y, motion.to.y, ease);
        if (!this.reduced) {
          this.robot.rig.rotation.x =
            Math.sin(progress * Math.PI * 2) *
            0.12 *
            (motion.command === "forward" ? 1 : -1);
          this.robot.rig.position.y =
            Math.sin(progress * Math.PI) * 0.11 +
            Math.max(0, Math.sin(((progress - 0.7) / 0.3) * Math.PI)) * 0.065;
        }
      }
    }
    this.robot.root.position.set(x - offset, 0.103, z - offset);
    this.robot.root.rotation.y = angle;
    this.stopMarker.root.visible = state.failure !== null;
    this.stopMarker.root.position.set(
      state.pose.x - offset, 0, state.pose.y - offset,
    );
    if (state.won && this.winAt < 0) {
      this.winAt = this.time;
      this.burst();
    }
    if (!state.won) this.winAt = -1;
    const winAge = this.time - this.winAt;
    this.robot.animate(this.time, state.won, winAge, progress, this.reduced);
    if (state.won) {
      // A view-only greeting; logical facing never changes on success.
      const turnToChild = Math.atan2(Math.sin(-angle), Math.cos(-angle));
      this.robot.rig.rotation.y = turnToChild * Math.min(1, winAge / 0.32);
    }
    this.star.position.y =
      (state.won ? 1.7 : 0.75) +
      (this.reduced ? 0 : Math.sin(this.time * 1.8) * 0.085);
    this.star.rotation.y =
      0.28 + (this.reduced ? 0 : Math.sin(this.time * 0.75) * 0.65);
    this.star.scale.setScalar(state.won ? 0.55 : 1);
    this.confetti.visible = state.won && winAge < 1.8 && !this.reduced;
    if (this.confetti.visible)
      this.confetti.children.forEach((bit, i) => {
        const { angle: a, speed, lift } = bit.userData;
        bit.position.set(
          x - offset + Math.cos(a) * speed * winAge,
          0.7 + lift * winAge - 1.6 * winAge ** 2,
          z - offset + Math.sin(a) * speed * winAge,
        );
        bit.rotation.set(winAge * 4 + i, winAge * 2, i);
        bit.scale.setScalar(Math.max(0, 1 - winAge / 1.8));
      });
    this.renderer.render(this.scene, this.camera);
  }
  private loop = (timestamp: number) => {
    if (this.disposed) return;
    const delta = this.last ? Math.min(timestamp - this.last, 64) : 16;
    this.last = timestamp;
    this.render(delta);
    this.frame = requestAnimationFrame(this.loop);
  };
  advanceTime = (ms: number) => {
    this.render(Math.max(0, ms));
    this.last = performance.now();
  };
  /** Actual projected board corners for browser containment checks. */
  bounds = () => {
    const size = this.game.stage.size / 2 + 0.12;
    return [-size, size].flatMap((x) =>
      [-size, size].map((z) => {
        const p = new THREE.Vector3(x, -0.1, z).project(this.camera);
        return { x: p.x, y: p.y };
      }),
    );
  };
  view = () => {
    const pose = this.game.getSnapshot().pose,
      offset = (this.game.stage.size - 1) / 2;
    const project = (x: number, y: number) => {
      const p = new THREE.Vector3(x - offset, 0.103, y - offset).project(
        this.camera,
      );
      return { x: p.x, y: p.y };
    };
    return {
      robot: project(pose.x, pose.y),
      north: project(pose.x, pose.y - 1),
      east: project(pose.x + 1, pose.y),
      camera: this.camera.position.toArray(),
      stoppedTile: this.stopMarker.root.visible
        ? {
            x: this.stopMarker.root.position.x + offset,
            y: this.stopMarker.root.position.z + offset,
          }
        : null,
    };
  };
  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    this.canvas.removeEventListener("webglcontextlost", this.onContextLost);
    disposeGroup(this.scene);
    this.renderer.dispose();
  }
}
