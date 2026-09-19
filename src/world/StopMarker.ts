import * as THREE from "three";

/** A view-only marker on the exact stopped tile; it never moves the robot. */
export class StopMarker {
  root = new THREE.Group();
  badge = new THREE.Group();

  constructor() {
    const amber = new THREE.MeshBasicMaterial({ color: "#ce813a" });
    const cream = new THREE.MeshBasicMaterial({ color: "#fff9ed" });
    for (const side of [-1, 1]) {
      const horizontal = new THREE.Mesh(
        new THREE.BoxGeometry(0.92, 0.024, 0.05), amber,
      );
      horizontal.position.set(0, 0.11, side * 0.435);
      const vertical = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.024, 0.92), amber,
      );
      vertical.position.set(side * 0.435, 0.11, 0);
      this.root.add(horizontal, vertical);
    }
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.17, 32), amber);
    const stem = new THREE.Mesh(new THREE.PlaneGeometry(0.035, 0.115), cream);
    stem.position.set(0, 0.035, 0.005);
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.021, 12), cream);
    dot.position.set(0, -0.072, 0.005);
    this.badge.add(disc, stem, dot);
    this.badge.position.y = 1.5;
    this.root.add(this.badge);
    this.root.visible = false;
  }
}
