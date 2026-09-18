import * as THREE from 'three';

// Procedural detective office — night precinct.
export function buildOffice(scene) {
  const root = new THREE.Group();
  scene.add(root);

  const interactables = [];

  // Materials
  const matWall = new THREE.MeshStandardMaterial({ color: 0x6a7288, roughness: 0.85, metalness: 0.05 });
  const matFloor = new THREE.MeshStandardMaterial({ color: 0x4a4034, roughness: 0.8 });
  const matCeil = new THREE.MeshStandardMaterial({ color: 0x3a4050, roughness: 1 });
  const matWood = new THREE.MeshStandardMaterial({ color: 0x6a4a30, roughness: 0.7 });
  const matDarkWood = new THREE.MeshStandardMaterial({ color: 0x4a3828, roughness: 0.75 });
  const matMetal = new THREE.MeshStandardMaterial({ color: 0x8a9098, roughness: 0.45, metalness: 0.55 });
  const matPaper = new THREE.MeshStandardMaterial({ color: 0xd8d0c0, roughness: 0.9 });
  const matGlass = new THREE.MeshPhysicalMaterial({
    color: 0x88aacc, roughness: 0.15, transmission: 0.7, transparent: true, opacity: 0.35,
  });
  const matScreen = new THREE.MeshStandardMaterial({
    color: 0x112211, emissive: 0x225533, emissiveIntensity: 0.8, roughness: 0.3,
  });
  const matFabric = new THREE.MeshStandardMaterial({ color: 0x3a4038, roughness: 0.95 });
  const matCork = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.95 });
  const matCard = new THREE.MeshStandardMaterial({ color: 0xc8b890, roughness: 0.9 });
  const matRed = new THREE.MeshStandardMaterial({ color: 0x8a2020, roughness: 0.8 });

  // Room shell: 12m x 9m x 3m
  const W = 12, D = 9, H = 3.0;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), matFloor);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  root.add(floor);

  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), matCeil);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = H;
  root.add(ceil);

  function wall(w, h, x, y, z, ry = 0) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.16), matWall);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    m.castShadow = true;
    m.receiveShadow = true;
    root.add(m);
    return m;
  }
  wall(W, H, 0, H / 2, -D / 2);
  wall(W, H, 0, H / 2, D / 2);
  wall(D, H, -W / 2, H / 2, 0, Math.PI / 2);
  wall(D, H, W / 2, H / 2, 0, Math.PI / 2);

  // Window on -Z wall (city night)
  const winFrame = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.6, 0.1), matDarkWood);
  winFrame.position.set(2.5, 1.6, -D / 2 + 0.08);
  root.add(winFrame);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 1.35), matGlass);
  glass.position.set(2.5, 1.6, -D / 2 + 0.14);
  root.add(glass);
  // City glow quad
  const city = new THREE.Mesh(
    new THREE.PlaneGeometry(2.9, 1.35),
    new THREE.MeshBasicMaterial({ color: 0x1a3048 })
  );
  city.position.set(2.5, 1.6, -D / 2 + 0.05);
  root.add(city);
  // Fake city lights
  for (let i = 0; i < 40; i++) {
    const light = new THREE.Mesh(
      new THREE.PlaneGeometry(0.04 + Math.random() * 0.06, 0.03 + Math.random() * 0.04),
      new THREE.MeshBasicMaterial({
        color: Math.random() > 0.5 ? 0xffcc88 : 0x88aaff,
        transparent: true,
        opacity: 0.5 + Math.random() * 0.5,
      })
    );
    light.position.set(
      2.5 + (Math.random() - 0.5) * 2.6,
      1.1 + Math.random() * 1.0,
      -D / 2 + 0.06
    );
    root.add(light);
  }
  // Rain streaks (subtle)
  const rainGeo = new THREE.BufferGeometry();
  const rainN = 80;
  const rainPos = new Float32Array(rainN * 3);
  for (let i = 0; i < rainN; i++) {
    rainPos[i * 3] = 2.5 + (Math.random() - 0.5) * 2.8;
    rainPos[i * 3 + 1] = 1.0 + Math.random() * 1.4;
    rainPos[i * 3 + 2] = -D / 2 + 0.12;
  }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.Points(
    rainGeo,
    new THREE.PointsMaterial({ color: 0x88aacc, size: 0.02, transparent: true, opacity: 0.4 })
  );
  root.add(rain);

  // Desk
  const desk = new THREE.Group();
  desk.position.set(-1.2, 0, -1.8);
  const deskTop = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 1.2), matWood);
  deskTop.position.y = 0.78;
  deskTop.castShadow = true;
  desk.add(deskTop);
  for (const [x, z] of [[-1.1, -0.5], [1.1, -0.5], [-1.1, 0.5], [1.1, 0.5]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.78, 0.08), matDarkWood);
    leg.position.set(x, 0.39, z);
    desk.add(leg);
  }
  root.add(desk);

  // Computer monitor + tower
  const monitor = new THREE.Group();
  monitor.position.set(-1.5, 0.82, -2.0);
  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.15), matMetal);
  stand.position.y = 0.03;
  monitor.add(stand);
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.06), matMetal);
  neck.position.y = 0.15;
  monitor.add(neck);
  const screenFrame = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.45, 0.04), matDarkWood);
  screenFrame.position.y = 0.42;
  monitor.add(screenFrame);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.38), matScreen);
  screen.position.set(0, 0.42, 0.03);
  monitor.add(screen);
  root.add(monitor);
  interactables.push({
    id: 'computer',
    label: 'ใช้คอมพิวเตอร์',
    object: monitor,
    action: 'computer',
    radius: 2.2,
  });

  // Desk phone
  const phone = new THREE.Group();
  phone.position.set(-0.4, 0.84, -1.6);
  const phoneBase = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.22), matDarkWood);
  phone.add(phoneBase);
  const handset = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.07), matDarkWood);
  handset.position.set(0, 0.05, -0.06);
  phone.add(handset);
  root.add(phone);
  interactables.push({
    id: 'desk-phone',
    label: 'ตรวจโทรศัพท์บนโต๊ะ',
    object: phone,
    action: 'evidence',
    evidenceId: 'ev-desk-phone',
    radius: 1.8,
  });

  // Desk lamp
  const lamp = new THREE.Group();
  lamp.position.set(-2.0, 0.82, -2.2);
  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.04), matMetal);
  lamp.add(lampBase);
  const lampArm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35), matMetal);
  lampArm.position.y = 0.18;
  lampArm.rotation.z = 0.3;
  lamp.add(lampArm);
  const lampHead = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 0.12, 12, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xc9a227, emissive: 0xc9a227, emissiveIntensity: 0.6, side: THREE.DoubleSide })
  );
  lampHead.position.set(0.08, 0.36, 0);
  lampHead.rotation.z = 0.5;
  lamp.add(lampHead);
  root.add(lamp);

  // Papers on desk
  for (let i = 0; i < 5; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.005, 0.3), matPaper);
    p.position.set(-0.8 + Math.random() * 1.2, 0.83 + i * 0.006, -1.5 + Math.random() * 0.3);
    p.rotation.y = (Math.random() - 0.5) * 0.4;
    root.add(p);
  }

  // Chair
  const chair = new THREE.Group();
  chair.position.set(-1.2, 0, -0.7);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.55), matFabric);
  seat.position.y = 0.45;
  chair.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.6, 0.08), matFabric);
  back.position.set(0, 0.78, 0.24);
  chair.add(back);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.45), matMetal);
  post.position.y = 0.22;
  chair.add(post);
  root.add(chair);

  // Investigation board (cork board on -X wall)
  const board = new THREE.Group();
  board.position.set(-W / 2 + 0.1, 1.6, 0.5);
  const cork = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.5, 2.4), matCork);
  board.add(cork);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.62, 2.52), matDarkWood);
  frame.position.x = -0.02;
  board.add(frame);
  // Pinned cards
  const cardData = [
    { y: 0.4, z: -0.8, c: matCard },
    { y: 0.35, z: 0.1, c: matCard },
    { y: 0.2, z: 0.85, c: matPaper },
    { y: -0.2, z: -0.5, c: matPaper },
    { y: -0.35, z: 0.4, c: matCard },
    { y: 0.05, z: -0.15, c: matRed },
  ];
  for (const cd of cardData) {
    const card = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.28, 0.2), cd.c);
    card.position.set(0.06, cd.y, cd.z);
    card.rotation.x = (Math.random() - 0.5) * 0.15;
    card.rotation.z = (Math.random() - 0.5) * 0.2;
    board.add(card);
  }
  // String lines (red yarn aesthetic)
  for (let i = 0; i < 4; i++) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.08, 0.35 - i * 0.1, -0.8 + i * 0.4),
      new THREE.Vector3(0.12, 0.1 - i * 0.05, 0),
      new THREE.Vector3(0.08, -0.2 + i * 0.05, 0.7 - i * 0.2),
    ]);
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 12, 0.008, 4, false),
      new THREE.MeshStandardMaterial({ color: 0xaa2222, roughness: 0.6 })
    );
    board.add(tube);
  }
  root.add(board);
  interactables.push({
    id: 'board',
    label: 'เปิดกระดานสืบสวน',
    object: board,
    action: 'board',
    radius: 2.5,
  });

  // City map on wall
  const mapFrame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 0.06), matDarkWood);
  mapFrame.position.set(-W / 2 + 0.1, 1.5, -2.2);
  mapFrame.rotation.y = Math.PI / 2;
  root.add(mapFrame);
  const mapFace = new THREE.Mesh(
    new THREE.PlaneGeometry(1.45, 0.95),
    new THREE.MeshStandardMaterial({ color: 0x2a3848, roughness: 0.9 })
  );
  mapFace.position.set(-W / 2 + 0.14, 1.5, -2.2);
  mapFace.rotation.y = Math.PI / 2;
  root.add(mapFace);
  // Map grid lines
  for (let i = 0; i < 6; i++) {
    const line = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 0.01),
      new THREE.MeshBasicMaterial({ color: 0x3d7ea6, transparent: true, opacity: 0.5 })
    );
    line.position.set(-W / 2 + 0.15, 1.15 + i * 0.14, -2.2);
    line.rotation.y = Math.PI / 2;
    root.add(line);
  }
  interactables.push({
    id: 'map',
    label: 'ดูแผนที่เมือง',
    object: mapFrame,
    action: 'computer-app',
    app: 'map',
    radius: 2.0,
  });

  // Filing cabinet
  const cabinet = new THREE.Group();
  cabinet.position.set(4.5, 0, -3.5);
  const cabBody = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.4, 0.8), matMetal);
  cabBody.position.y = 0.7;
  cabBody.castShadow = true;
  cabinet.add(cabBody);
  for (let i = 0; i < 4; i++) {
    const drawer = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.28, 0.04), matDarkWood);
    drawer.position.set(0, 0.35 + i * 0.32, 0.42);
    cabinet.add(drawer);
  }
  root.add(cabinet);
  interactables.push({
    id: 'cabinet',
    label: 'ค้นแฟ้มคดี',
    object: cabinet,
    action: 'evidence',
    evidenceId: 'ev-financial-audit',
    radius: 1.8,
  });

  // Evidence table
  const evTable = new THREE.Group();
  evTable.position.set(3.2, 0, 1.5);
  const evTop = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 1.0), matWood);
  evTop.position.y = 0.75;
  evTable.add(evTop);
  for (const [x, z] of [[-0.7, -0.4], [0.7, -0.4], [-0.7, 0.4], [0.7, 0.4]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.75, 0.06), matMetal);
    leg.position.set(x, 0.37, z);
    evTable.add(leg);
  }
  // Evidence bag
  const bag = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.18, 0.02), matPaper);
  bag.position.set(-0.3, 0.86, 0);
  evTable.add(bag);
  // USB
  const usb = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.03), matMetal);
  usb.position.set(0.2, 0.8, 0.1);
  evTable.add(usb);
  // Phone bag
  const phoneBag = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, 0.01), matPaper);
  phoneBag.position.set(0.4, 0.86, -0.2);
  phoneBag.rotation.y = 0.4;
  evTable.add(phoneBag);
  root.add(evTable);
  interactables.push({
    id: 'evidence-table',
    label: 'ตรวจหลักฐาน',
    object: evTable,
    action: 'evidence',
    evidenceId: 'ev-usb',
    radius: 1.8,
  });

  // CCTV monitor on side table
  const cctvDesk = new THREE.Group();
  cctvDesk.position.set(4.0, 0, 0);
  const cctvTop = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.05, 0.7), matDarkWood);
  cctvTop.position.y = 0.7;
  cctvDesk.add(cctvTop);
  const cctvScreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.35, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x111, emissive: 0x1a4a2a, emissiveIntensity: 0.5 })
  );
  cctvScreen.position.set(0, 0.95, 0);
  cctvDesk.add(cctvScreen);
  const cctvNeck = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.06), matMetal);
  cctvNeck.position.set(0, 0.78, 0);
  cctvDesk.add(cctvNeck);
  root.add(cctvDesk);
  interactables.push({
    id: 'cctv',
    label: 'เปิดกล้องวงจรปิด',
    object: cctvDesk,
    action: 'evidence',
    evidenceId: 'ev-cctv-stair',
    radius: 1.8,
  });

  // Interrogation chairs (corner, decorative + hotspot)
  const iqZone = new THREE.Group();
  iqZone.position.set(-4.0, 0, 2.8);
  function simpleChair(x, z, ry) {
    const g = new THREE.Group();
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.06, 0.45), matFabric);
    s.position.y = 0.42;
    g.add(s);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.5, 0.06), matFabric);
    b.position.set(0, 0.7, 0.2);
    g.add(b);
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    return g;
  }
  iqZone.add(simpleChair(-0.6, 0, 0.4));
  iqZone.add(simpleChair(0.6, 0, -0.4));
  const iqTable = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.5), matMetal);
  iqTable.position.y = 0.55;
  iqZone.add(iqTable);
  root.add(iqZone);
  interactables.push({
    id: 'interrogate',
    label: 'สอบปากคำผู้ต้องสงสัย',
    object: iqZone,
    action: 'interrogate',
    radius: 2.0,
  });

  // Suspect photos on wall (hotspots for file)
  const photoWall = new THREE.Group();
  photoWall.position.set(W / 2 - 0.1, 1.5, 0);
  const photos = ['ELENA', 'DAVID', 'SARAH', 'JAMES'];
  photos.forEach((name, i) => {
    const pf = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.45, 0.35), matDarkWood);
    pf.position.set(0, 0.3 - i * 0.5, -1.2 + (i % 2) * 0.5);
    photoWall.add(pf);
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(0.28, 0.35),
      new THREE.MeshStandardMaterial({
        color: [0x6a5a8a, 0x4a6a5a, 0x7a5a4a, 0x4a5a7a][i],
        roughness: 0.9,
      })
    );
    face.position.set(-0.03, 0.3 - i * 0.5, -1.2 + (i % 2) * 0.5);
    face.rotation.y = -Math.PI / 2;
    photoWall.add(face);
  });
  root.add(photoWall);
  interactables.push({
    id: 'suspects-wall',
    label: 'ดูรูปผู้ต้องสงสัย',
    object: photoWall,
    action: 'file',
    radius: 2.0,
  });

  // Wall clock
  const clock = new THREE.Group();
  clock.position.set(0, 2.4, -D / 2 + 0.1);
  const clockFace = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.04, 24),
    new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.8 })
  );
  clockFace.rotation.x = Math.PI / 2;
  clock.add(clockFace);
  const hourHand = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.1, 0.01),
    new THREE.MeshStandardMaterial({ color: 0x222 })
  );
  hourHand.position.set(0.02, 0.04, 0.03);
  clock.add(hourHand);
  const minHand = new THREE.Mesh(
    new THREE.BoxGeometry(0.015, 0.15, 0.01),
    new THREE.MeshStandardMaterial({ color: 0x222 })
  );
  minHand.position.set(-0.03, 0.05, 0.03);
  minHand.rotation.z = 0.8;
  clock.add(minHand);
  root.add(clock);

  // Printer
  const printer = new THREE.Group();
  printer.position.set(-3.8, 0, -2.5);
  const pBody = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.25, 0.45), matMetal);
  pBody.position.y = 0.9;
  printer.add(pBody);
  const pTop = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.3), matDarkWood);
  pTop.position.y = 1.08;
  printer.add(pTop);
  const pStand = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 0.4), matDarkWood);
  pStand.position.y = 0.37;
  printer.add(pStand);
  root.add(printer);

  // Ceiling fluorescent
  const fluoro = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.06, 0.25),
    new THREE.MeshStandardMaterial({ color: 0xdde8ff, emissive: 0xb0c8ff, emissiveIntensity: 2.5 })
  );
  fluoro.position.set(-0.5, H - 0.08, 0);
  root.add(fluoro);
  const fluoro2 = fluoro.clone();
  fluoro2.position.set(2.5, H - 0.08, -1.5);
  fluoro2.rotation.y = Math.PI / 2;
  fluoro2.scale.set(0.7, 1, 1);
  root.add(fluoro2);

  // Coffee mug
  const mug = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.045, 0.1, 12),
    new THREE.MeshStandardMaterial({ color: 0xc9a227, roughness: 0.7 })
  );
  mug.position.set(-0.2, 0.88, -2.0);
  root.add(mug);

  // Sticky notes on monitor
  for (let i = 0; i < 3; i++) {
    const note = new THREE.Mesh(
      new THREE.PlaneGeometry(0.08, 0.08),
      new THREE.MeshStandardMaterial({ color: 0xe8e060, roughness: 0.95 })
    );
    note.position.set(-1.25 + i * 0.12, 1.15, -1.96);
    note.rotation.y = 0.1;
    root.add(note);
  }

  // Timeline evidence on desk drawer area - case folder
  const folder = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.02, 0.28), matRed);
  folder.position.set(0.3, 0.84, -1.9);
  folder.rotation.y = 0.3;
  root.add(folder);
  interactables.push({
    id: 'case-folder',
    label: 'เปิดแฟ้มคดี',
    object: folder,
    action: 'file',
    radius: 1.6,
  });

  // Notebook on desk
  const notebook = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.015, 0.28), matPaper);
  notebook.position.set(0.0, 0.84, -1.7);
  notebook.rotation.y = -0.2;
  root.add(notebook);
  interactables.push({
    id: 'notebook',
    label: 'อ่านสมุดผู้ตาย',
    object: notebook,
    action: 'evidence',
    evidenceId: 'ev-email-invite',
    radius: 1.6,
  });

  // Building keycard reader replica near door (visual)
  const door = new THREE.Group();
  door.position.set(W / 2 - 0.05, 0, 3.2);
  const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.1, 0.95), matDarkWood);
  doorPanel.position.y = 1.05;
  door.add(doorPanel);
  const reader = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.08), matMetal);
  reader.position.set(-0.08, 1.2, -0.55);
  door.add(reader);
  root.add(door);
  interactables.push({
    id: 'keycard-log',
    label: 'ดึงบันทึกบัตรผ่าน',
    object: door,
    action: 'evidence',
    evidenceId: 'ev-keycard',
    radius: 1.8,
  });

  // Timeline hotspots via room props that map to evidence
  const phoneCell = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.02), matDarkWood);
  phoneCell.position.set(-0.55, 0.88, -1.55);
  root.add(phoneCell);
  interactables.push({
    id: 'victim-phone',
    label: 'ดึงข้อมูลมือถือผู้ตาย',
    object: phoneCell,
    action: 'evidence',
    evidenceId: 'ev-victim-phone',
    radius: 1.6,
  });

  // Receipt paper
  const receipt = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.002, 0.18), matPaper);
  receipt.position.set(-0.15, 0.845, -1.45);
  receipt.rotation.y = 0.5;
  root.add(receipt);
  interactables.push({
    id: 'receipt',
    label: 'อ่านใบเสร็จร้านอาหาร',
    object: receipt,
    action: 'evidence',
    evidenceId: 'ev-restaurant-receipt',
    radius: 1.6,
  });

  // CCTV still on desk
  const cctvPrint = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.002, 0.14), matPaper);
  cctvPrint.position.set(-0.9, 0.845, -1.4);
  root.add(cctvPrint);
  interactables.push({
    id: 'cctv-sedan',
    label: 'ดูภาพ CCTV',
    object: cctvPrint,
    action: 'evidence',
    evidenceId: 'ev-cctv-sedan',
    radius: 1.6,
  });

  // Forensics folder on cabinet top
  const meFolder = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.22), matPaper);
  meFolder.position.set(4.5, 1.42, -3.5);
  root.add(meFolder);
  interactables.push({
    id: 'autopsy',
    label: 'อ่านรายงานชันสูตร',
    object: meFolder,
    action: 'evidence',
    evidenceId: 'ev-autopsy',
    radius: 1.8,
  });

  // Scene photos
  const scenePhoto = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.002, 0.14), matPaper);
  scenePhoto.position.set(3.0, 0.8, 1.5);
  root.add(scenePhoto);
  interactables.push({
    id: 'scene-photos',
    label: 'ตรวจภาพที่เกิดเหตุ',
    object: scenePhoto,
    action: 'evidence',
    evidenceId: 'ev-scene-photos',
    radius: 1.8,
  });

  // Bank statement
  const bankDoc = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.002, 0.3), matPaper);
  bankDoc.position.set(3.4, 0.8, 1.4);
  root.add(bankDoc);
  interactables.push({
    id: 'bank-james',
    label: 'อ่านธุรกรรมธนาคาร',
    object: bankDoc,
    action: 'evidence',
    evidenceId: 'ev-bank-james',
    radius: 1.8,
  });

  // Witness statement
  const witness = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.002, 0.3), matPaper);
  witness.position.set(3.5, 0.8, 1.7);
  root.add(witness);
  interactables.push({
    id: 'witness',
    label: 'อ่านคำให้การพยาน',
    object: witness,
    action: 'evidence',
    evidenceId: 'ev-witness-cleaner',
    radius: 1.8,
  });

  // PI invoice
  const piDoc = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.002, 0.28), matPaper);
  piDoc.position.set(4.5, 1.42, -3.3);
  root.add(piDoc);
  interactables.push({
    id: 'pi-invoice',
    label: 'อ่านใบแจ้งหนี้นักสืบ',
    object: piDoc,
    action: 'evidence',
    evidenceId: 'ev-pi-invoice',
    radius: 1.8,
  });

  // Keys
  const keys = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.01, 0.04), matMetal);
  keys.position.set(-1.8, 0.84, -1.5);
  root.add(keys);
  interactables.push({
    id: 'keys',
    label: 'ตรวจพวงกุญแจ',
    object: keys,
    action: 'evidence',
    evidenceId: 'ev-key-ring',
    radius: 1.6,
  });

  // Phone tower printout
  const tower = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.002, 0.28), matPaper);
  tower.position.set(-1.0, 0.845, -2.1);
  root.add(tower);
  interactables.push({
    id: 'phone-tower',
    label: 'อ่านข้อมูลเสาสัญญาณ',
    object: tower,
    action: 'evidence',
    evidenceId: 'ev-phone-tower',
    radius: 1.6,
  });

  // Lights — brighter night office
  const amb = new THREE.AmbientLight(0x8a9ab8, 0.85);
  scene.add(amb);
  const hemi = new THREE.HemisphereLight(0xa8b8d0, 0x3a3428, 0.75);
  scene.add(hemi);

  const mainLight = new THREE.PointLight(0xe8eeff, 3.8, 22, 1.6);
  mainLight.position.set(-0.5, 2.7, 0);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.set(1024, 1024);
  scene.add(mainLight);

  const mainLight2 = new THREE.PointLight(0xd8e0f0, 2.4, 16, 1.8);
  mainLight2.position.set(2.5, 2.65, -1.5);
  scene.add(mainLight2);

  const deskLight = new THREE.PointLight(0xffe8b8, 2.6, 8, 1.7);
  deskLight.position.set(-1.8, 1.35, -1.8);
  scene.add(deskLight);

  const cityLight = new THREE.PointLight(0x6699cc, 1.1, 12, 1.8);
  cityLight.position.set(2.5, 1.6, -D / 2 + 1.5);
  scene.add(cityLight);

  const boardLight = new THREE.SpotLight(0xfff0d0, 3.2, 10, Math.PI / 3.5, 0.45, 1.3);
  boardLight.position.set(-2.5, 2.6, 0.5);
  boardLight.target.position.set(-W / 2, 1.5, 0.5);
  scene.add(boardLight);
  scene.add(boardLight.target);

  const cabinetLight = new THREE.PointLight(0xd0d8e8, 1.2, 6, 2);
  cabinetLight.position.set(4.5, 2.2, -2.5);
  scene.add(cabinetLight);

  const evidenceLight = new THREE.PointLight(0xfff5e0, 1.5, 5, 2);
  evidenceLight.position.set(3.2, 1.8, 1.5);
  scene.add(evidenceLight);

  // Occasional rain intensity pulse
  let rainT = 0;
  function update(dt) {
    rainT += dt;
    const pos = rain.geometry.getAttribute('position');
    const arr = pos.array;
    for (let i = 0; i < rainN; i++) {
      arr[i * 3 + 1] -= dt * 1.8;
      if (arr[i * 3 + 1] < 0.95) arr[i * 3 + 1] = 2.4;
    }
    pos.needsUpdate = true;
    // Flicker fluorescent slightly
    const fl = Math.random() > 0.995 ? 0.4 : 1;
    fluoro.material.emissiveIntensity = 2.5 * fl * (0.95 + Math.sin(rainT * 2) * 0.05);
  }

  return { root, interactables, update, bounds: { W, D, H } };
}
