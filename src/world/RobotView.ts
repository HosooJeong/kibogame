import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const material = (color: string) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.55 });
const WHITE = "#fffef5",
  INK = "#304b4b",
  MINT = "#84bfb0";
const rounded = (
  w: number,
  h: number,
  d: number,
  color: string,
  radius = 0.07,
) => {
  const mesh = new THREE.Mesh(
    new RoundedBoxGeometry(w, h, d, 3, radius),
    material(color),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
};
function curve(points: THREE.Vector3[], color: string, radius = 0.017) {
  return new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points),
      16,
      radius,
      6,
      false,
    ),
    material(color),
  );
}

/** View-only contract. Replace this factory with a GLB group; keep root/rig/face API. */
export class RobotView {
  root = new THREE.Group();
  rig = new THREE.Group();
  private eyes = new THREE.Group();
  private happyEyes = new THREE.Group();
  private feet: THREE.Mesh[] = [];
  constructor() {
    this.root.add(this.rig);
    const body = rounded(0.72, 0.69, 0.64, WHITE, 0.105);
    body.position.y = 0.59;
    this.rig.add(body);
    const screen = rounded(0.55, 0.37, 0.046, "#e2f0e8", 0.09);
    screen.position.set(0, 0.62, 0.324);
    this.rig.add(screen);
    for (const x of [-0.135, 0.135]) {
      const eye = rounded(0.063, 0.099, 0.025, INK, 0.027);
      eye.position.set(x, 0.664, 0.358);
      this.eyes.add(eye);
      const glint = new THREE.Mesh(
        new THREE.SphereGeometry(0.014, 8, 6),
        material(WHITE),
      );
      glint.position.set(x - 0.01, 0.683, 0.374);
      this.eyes.add(glint);
      this.happyEyes.add(
        curve(
          [
            new THREE.Vector3(x - 0.043, 0.64, 0.362),
            new THREE.Vector3(x, 0.68, 0.362),
            new THREE.Vector3(x + 0.043, 0.64, 0.362),
          ],
          INK,
        ),
      );
      const cheek = new THREE.Mesh(
        new THREE.SphereGeometry(0.034, 10, 8),
        material("#efbdab"),
      );
      cheek.scale.set(1, 0.52, 0.22);
      cheek.position.set(x * 1.55, 0.582, 0.355);
      this.rig.add(cheek);
    }
    this.rig.add(this.eyes, this.happyEyes);
    this.rig.add(
      curve(
        [
          new THREE.Vector3(-0.047, 0.567, 0.36),
          new THREE.Vector3(0, 0.547, 0.367),
          new THREE.Vector3(0.047, 0.567, 0.36),
        ],
        INK,
        0.012,
      ),
    );
    for (const side of [-1, 1]) {
      const arm = rounded(0.15, 0.32, 0.22, MINT, 0.065);
      arm.position.set(side * 0.423, 0.48, 0.02);
      arm.rotation.z = side * 0.12;
      this.rig.add(arm);
      const foot = rounded(0.25, 0.16, 0.37, "#95b9bd", 0.055);
      foot.position.set(side * 0.18, 0.125, 0.035);
      this.rig.add(foot);
      this.feet.push(foot);
    }
    const neck = rounded(0.26, 0.12, 0.25, MINT, 0.035);
    neck.position.y = 0.237;
    this.rig.add(neck);
    const antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.026, 0.12, 10),
      material(INK),
    );
    antenna.position.y = 0.989;
    this.rig.add(antenna);
    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.071, 16, 10),
      material("#edc15e"),
    );
    tip.position.y = 1.076;
    tip.castShadow = true;
    this.rig.add(tip);
    const pack = rounded(0.37, 0.32, 0.09, MINT, 0.065);
    pack.position.set(0, 0.57, -0.335);
    this.rig.add(pack);
    for (const x of [-0.085, 0, 0.085]) {
      const vent = rounded(0.024, 0.13, 0.018, "#5e9687", 0.008);
      vent.position.set(x, 0.59, -0.388);
      this.rig.add(vent);
    }
    const arrowShape = new THREE.Shape();
    arrowShape.moveTo(-0.085, -0.08);
    arrowShape.lineTo(0.085, -0.08);
    arrowShape.lineTo(0.085, 0.11);
    arrowShape.lineTo(0.19, 0.11);
    arrowShape.lineTo(0, 0.32);
    arrowShape.lineTo(-0.19, 0.11);
    arrowShape.lineTo(-0.085, 0.11);
    arrowShape.closePath();
    const arrow = new THREE.Mesh(
      new THREE.ShapeGeometry(arrowShape),
      new THREE.MeshBasicMaterial({ color: "#3a8c76", side: THREE.DoubleSide }),
    );
    arrow.rotation.x = Math.PI / 2;
    arrow.position.set(0, 0.012, 1.02);
    this.root.add(arrow);
  }
  animate(
    time: number,
    won: boolean,
    winAge: number,
    moving: number,
    reduced: boolean,
  ) {
    this.eyes.visible = !won;
    this.happyEyes.visible = won;
    const blink = Math.sin(time * 1.2) > 0.997 ? 0.13 : 1;
    this.eyes.scale.y = blink;
    this.eyes.position.y = 0.66 * (1 - blink);
    this.feet.forEach((foot, i) => {
      foot.position.y =
        0.125 +
        (reduced
          ? 0
          : Math.sin(moving * Math.PI * 4 + i * Math.PI) *
            0.036 *
            (moving > 0 ? 1 : 0));
    });
    if (won && winAge < 1.6 && !reduced) {
      this.rig.position.y =
        Math.abs(Math.sin((winAge / 1.6) * Math.PI * 3)) *
        0.3 *
        (1 - winAge / 2.2);
      this.rig.rotation.z = Math.sin(winAge * 12) * 0.09;
    }
  }
}
