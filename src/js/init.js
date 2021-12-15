/********************************************************************************************************
*  Projet d'Informatique 3B, 2021-2022, Alexandre BEAUJON & Émile ROUSSEAU,
*  Université de Bourgogne, Dijon, France.
*  Synthèse d'Images 3D & Animation avec la librairie THREE.js.
*  Sujet : modélisation et animation d'une partie de curling.
/********************************************************************************************************/


// Constantes globales
const STONE_MAIN_COLOR = 0x555555;
const BLUE_TEAM_COLOR = 0x0000ff;
const RED_TEAM_COLOR = 0xff0000;
const STONE_HEIGHT = 2;
const STONE_RADIUS = 2;
const houseRadius = 35/2/2;
const SHEET_LENGTH = 80
const STONE_BROOM_DIST = 4;

class Stone extends THREE.Group
{
  launched = false;
  speed = new THREE.Vector3();
  friction = 1; // Unité arbitraire (ce n'est pas une simulation)
  normalFriction = 1;
  broomFriction = 0.2;
  movementType = "Linéaire"; // Peut être soit "Linéaire" (chute libre) soit "Courbe" (le mouvement suit une courbe de bézier 3D quadratique stockée dans this.curve)
  curve = new THREE.QuadraticBezierCurve3();
  curvePos = 0;
  team = 0;
  radius;
  lastPosition = new THREE.Vector3();
  traveledDistance = 0;

  constructor(radius, color, pos, teamNb)
  {
    super();
    this.position.set(pos.x, pos.y, pos.z);
    this.radius = radius;
    this.makeStone(radius, STONE_MAIN_COLOR, color);
    this.team = teamNb;
    this.lastPosition.copy(this.position);
    this.useBroom(false);
  }

  makeStone(radius, mainCol, teamColor)
  {
    // Définitions des grandeurs
    let stoneHeightMiddle = STONE_HEIGHT*0.3;
    let baseRadius = STONE_RADIUS*0.8;
    let handleRadius = STONE_RADIUS/20;
    let verticalCylinderLength = STONE_RADIUS/8;
    let cylinderSpacing = verticalCylinderLength/4;
    let baseHeight = STONE_HEIGHT/10;
    let horizontalCylinderLength = STONE_RADIUS-(2*handleRadius)-cylinderSpacing;

    // Création de la pierre en elle-même
    var A, B, C, D;
    var bezSup, bezInf, bezCent;
    var latheSup, latheInf, latheCent;
    var mainMaterial, teamMaterial;

    mainMaterial = new THREE.MeshPhongMaterial({color: mainCol, flatShading: false, side: THREE.DoubleSide});
    teamMaterial = new THREE.MeshPhongMaterial({color: teamColor, flatShading: false, side: THREE.DoubleSide});

    A = new THREE.Vector2(0, STONE_HEIGHT / 2);
    B = new THREE.Vector2(radius, stoneHeightMiddle/2);
    C = new THREE.Vector2(radius, -stoneHeightMiddle/2);
    D = new THREE.Vector2(0, -STONE_HEIGHT / 2);

    bezSup = new THREE.CubicBezierCurve(A, new THREE.Vector2(radius, 1), new THREE.Vector2(radius, 1), B);
    bezCent = new THREE.CubicBezierCurve(B, C, B, C);
    bezInf = new THREE.CubicBezierCurve(C, new THREE.Vector2(radius, -1), new THREE.Vector2(radius, -1), D);

    // Une autre grandeur
    let stoneTop = bezSup.getPoint(baseRadius/radius).y+stoneHeightMiddle/2; // Le dessus de la pierre à l'endroit où l'on pose le socle -> on ne veut pas d'espace entre la pierre et le socle de la poignée.

    latheSup = Stone.LatheFromBezier(bezSup, 50, 80);
    latheCent = Stone.LatheFromBezier(bezCent, 50, 80);
    latheInf = Stone.LatheFromBezier(bezInf, 50, 80);

    latheSup.material = mainMaterial;
    latheInf.material = mainMaterial;
    latheCent.material = teamMaterial;

    // Création de la poignée, les handlei sont détaillées sur le rapport
    var handle1Mesh, handle2Mesh, handle3Mesh, handle4Mesh, handle5Mesh;
    var handle2Geometry, handle3Geometry, handle4Geometry;
    var handle1Bez, handle5Bez;
        
    handle1Bez = new THREE.CubicBezierCurve(
        new THREE.Vector2( 0, handleRadius ),
        new THREE.Vector2( handleRadius, handleRadius ),
        new THREE.Vector2( handleRadius, handleRadius ),
        new THREE.Vector2( handleRadius, 0 )
      );

    handle1Mesh = Stone.LatheFromBezier(handle1Bez, 50, 80);
    // Rotation handle1Mesh
    handle1Mesh.rotateOnAxis( new THREE.Vector3( 0, 0, 1), Math.PI/2 );
    handle1Mesh.position.set(-STONE_RADIUS+handleRadius, baseHeight+stoneTop+verticalCylinderLength+cylinderSpacing+handleRadius, 0);

    handle2Geometry = new THREE.CylinderGeometry(handleRadius, handleRadius, horizontalCylinderLength , 50, 1, true);
    handle2Mesh = new THREE.Mesh(handle2Geometry);
    handle2Mesh.position.set(-STONE_RADIUS+handleRadius+horizontalCylinderLength/2, baseHeight+stoneTop+verticalCylinderLength+cylinderSpacing+handleRadius, 0);
    handle2Mesh.rotateOnAxis( new THREE.Vector3(0, 0, 1), Math.PI/2 );

    handle3Geometry = new THREE.TorusGeometry(handleRadius+cylinderSpacing, handleRadius, 50, 80, Math.PI/2);
    handle3Mesh = new THREE.Mesh(handle3Geometry);
    handle3Mesh.position.set( -handleRadius-cylinderSpacing, baseHeight+stoneTop+verticalCylinderLength, 0 );

    handle4Geometry = new THREE.CylinderGeometry(handleRadius, handleRadius, verticalCylinderLength , 50, 1, true);
    handle4Mesh = new THREE.Mesh(handle4Geometry);
    handle4Mesh.position.set(0, baseHeight+(verticalCylinderLength)/2+stoneTop, 0);


    handle5Bez = new THREE.CubicBezierCurve(
      new THREE.Vector2( handleRadius, baseHeight ),
      new THREE.Vector2( handleRadius, 0 ),
      new THREE.Vector2( baseRadius, baseHeight ),
      new THREE.Vector2( baseRadius, 0 )
    );

    handle5Mesh = Stone.LatheFromBezier(handle5Bez, 50, 80);
    handle5Mesh.position.set( 0, stoneTop, 0 ); 

    handle1Mesh.material = teamMaterial;
    handle2Mesh.material = mainMaterial;
    handle3Mesh.material = teamMaterial;
    handle4Mesh.material = mainMaterial;
    handle5Mesh.material = teamMaterial;

    

    this.add(latheSup, latheCent, latheInf, handle1Mesh, handle2Mesh, handle3Mesh, handle4Mesh, handle5Mesh);
  }

  static LatheFromBezier(bez, precision, smoothness)
  {
    const points = bez.getPoints(precision);
    return Stone.LatheFromPoints(points, smoothness);  
  }

  static LatheFromPoints(points, smoothness)
  {
    const geometry = new THREE.LatheGeometry(points, smoothness);
    var mesh = new THREE.Mesh(geometry);
    //mesh.rotateOnAxis(new THREE.Vector3(1, 0, 0), Math.PI / 2);
    return mesh; 
  }

  update(dt) //dt pour Delta Time = le temps écoulé depuis la dernière frame
  {
    if(this.launched)
    {
      if(this.movementType == "Linéaire")
      {
        this.lastPosition.copy(this.position);

        let dM = new THREE.Vector3(); // Vecteur déplacement

        dM.copy(this.speed);
        dM.multiplyScalar(dt);

        this.position.add(dM); // Déplacement de la pierre
        this.traveledDistance+= dM;

        this.computeFriction(dt);
      }
      else if(this.movementType == "Courbe")
      {
        var length = this.curve.getLength(); // length est la longueur de la courbe. La longueur entre t' et t est (t - t') * length.
        var sspeed = this.speed.length(); // sspeed est la longueur du vecteur vitesse
        var dM = sspeed * dt; // dM est la distance à parcourir le long de la courbe.

        // Déplacement le long de la courbe
        var t = dM / length + this.curvePos;

        if(t > 1) // Si la pierre est arrivée en bout de course, on passe le type en "Lineaire" (= chute libre), on modifie son vecteur vitesse et on retourne dans la fonction update.
        {  
          this.setFreeFall(t);
          this.update(dt);
        }
        else
        {
          this.lastPosition.copy(this.position);

          var targetPos = this.curve.getPointAt(t);
          this.position.set(targetPos.x, targetPos.y, targetPos.z);
          this.curvePos = t;
          this.traveledDistance += dM;

          this.speed = this.curve.getTangent(this.curvePos); // La vitesse doit rester tangente avec la courbe (pour le calcul des collisions si nécessaire)
          this.speed.multiplyScalar(sspeed); // La tangente est unitaire. On veut conserver la valeur de la vitesse.

          this.computeFriction(dt);
        }
      }

    }
  }

  useBroom(use)
  {
    this.use = use;

    if(use)
      this.friction = this.broomFriction;
    else
      this.friction = this.normalFriction;
  }

  computeFriction(dt)
  {
    let f = new THREE.Vector3(); // Vecteur frottement, ou "freinage"
    f.copy(this.speed);
    f.multiplyScalar(-1 * this.friction * dt);

    this.speed.add(f);
  }

  cancelLastMovement()
  {
    this.position.copy(this.lastPosition);
  }

  setFreeFall()
  {
    this.movementType = "Linéaire";
  }

  isMoving()
  {
    let epsilon = 0.001;

    return (this.speed.lengthSq() > epsilon);
  }

  isColliding(other) // Collision avec une autre pierre
  {
    var dist = this.position.distanceTo(other.position);

    return dist <= this.radius + other.radius;
  }

  getForwardVector()
  {
    if(this.speed.lengthSq() < 0.00001)
      return new THREE.Vector3(1, 0, 0);
    else
      return this.speed.clone().normalize();
  }
}

class Broom extends THREE.Group
{
  parentStone;
  scene;
  using = false;
  arrowHelper;

  constructor(color, scene)
  {
    super();
    this.makeBroom(color);
    this.parentStone = null;
    this.scene = scene;
  }

  makeBroom(color)
  {
    const cylinderRadius = 0.15;
    const cylinderHeight = 15;
    const cylinderSmoothness = 32;

    const rectangleWidth = 2.5;
    const rectangleHeight = .5;
    const rectangleDepth = 1;
    const rectangleColor = 0x555555;

    const coneHeight = -.6;
    const coneRadius = 0.1;
    const coneSmoothness = 50;
    const coneOffsetY = (-1)*(rectangleHeight/2);  

    var cylinderGeometry = new THREE.CylinderGeometry( cylinderRadius, cylinderRadius, cylinderHeight, cylinderSmoothness );
      cylinderGeometry.translate( 0, cylinderHeight/2, 0); //modifie l'emplacement de l'origine du cylindre
    var cylinderMaterial = new THREE.MeshPhongMaterial( {color: color} );
    var cylinder = new THREE.Mesh( cylinderGeometry, cylinderMaterial );
      cylinder.rotateOnAxis( new THREE.Vector3(-1, 0, 0), Math.PI/5 );
    this.add( cylinder );


    const rectangleGeometry = new THREE.BoxGeometry( rectangleWidth, rectangleHeight, rectangleDepth );
    const rectangleMaterial = new THREE.MeshPhongMaterial( {color: rectangleColor} );
    const rectangle = new THREE.Mesh( rectangleGeometry, rectangleMaterial );
    this.add( rectangle );

    function cone()
    {
      const points = [];
      points.push( new THREE.Vector2( 0, coneHeight), new THREE.Vector2(coneRadius, 0) );
      const coneGeometry = new THREE.LatheGeometry( points, coneSmoothness);
      const coneMaterial = new THREE.MeshPhongMaterial( { color: color, side:THREE.DoubleSide, flatShading: false } );
      const lathe = new THREE.Mesh( coneGeometry, coneMaterial );
      lathe.position.set(0, coneOffsetY, 0);
      return lathe;
    }

    var nombreConeX = parseInt(rectangleWidth/(coneRadius*2));
    var nombreConeZ = parseInt(rectangleDepth/(coneRadius*2));
    var coneOffsetX = (rectangleWidth%(coneRadius*2))/(nombreConeX+1);
    var coneOffsetZ = (rectangleDepth%(coneRadius*2))/(nombreConeZ+1);

    var origine = new THREE.Vector3();
    origine.y = coneOffsetY;
    origine.x = (-1)*(rectangleWidth/2)+coneRadius+coneOffsetX;
    origine.z = (-1)*(rectangleDepth/2)+coneRadius+coneOffsetZ;

    for (let x=0; x<nombreConeX-1; x++)
    { 
      for (let z=0; z<nombreConeZ-1; z++)
      {
        var poil = cone();
        poil.position.set(origine.x + x*(coneRadius*2+coneOffsetX), coneOffsetY, origine.z + z*(coneRadius*2+coneOffsetZ));
        this.add(poil);
      }
    }
  }

  update(dt)
  {
    if(this.parentStone)
    {
      if(this.using)
      {
        // Le balai est un sous-objet de la pierre. "Sous-objet" est défini par le comportement de la méthode add() de Object3D. Il se trouve sur le cercle de rayon
        // STONE_BROOM_DIST et de centre, la pierre. Plus précisément, le balai se trouve sur la trajectoire de la pierre.
        this.position.copy(this.parentStone.getForwardVector().clone().multiplyScalar(STONE_BROOM_DIST)); // Origine de l'animation du balai

        // Il faut aussi appliquer une rotation (locale) au balai pour que le frottement se fasse sur un vecteur orthogonal au forwardVector de la pierre.
        // Il semblerait que la fonction angleTo() renvoie un angle non orienté (positif). La documentation THREE.js est peu bavarde concernant les rotations.
        // Voici une solution pour pallier à ce problème.
        if(this.parentStone.getForwardVector().z < 0)
          this.rotation.copy(new THREE.Euler(0, this.parentStone.getForwardVector().angleTo(new THREE.Vector3(1, 0, 0)), 0));
        else
          this.rotation.copy(new THREE.Euler(0, -this.parentStone.getForwardVector().angleTo(new THREE.Vector3(1, 0, 0)), 0));
        
        // Amélioration possible : animer le balai. Méthode : une animation représentée par un spline 2D sur [0, 1] -> [-1, 1]. En abscisses, le temps, en ordonnées,
        // le décalage du balai. Ce décalage sera à ajouter à la position du balai, dans une direction orthogonale au forwardVector de la pierre. Il suffira de
        // multiplier le temps par T pour avoir une animation de durée T.
      }
    }
  }

  attachToStone(stone)
  {
    this.parentStone = stone;
  }

  detach()
  {
    if(this.parentStone)
    {
      this.parentStone.remove(this);
      this.parentStone = null;
    }
  }

  use(val)
  {
    this.using = val;

    if(this.parentStone)
    {
      if(this.using)
      {
        this.parentStone.add(this);
      }
      else
      {
        this.parentStone.remove(this);
      }
    }
  }
}

class Sheet extends THREE.Group
{
  housePos = new THREE.Vector3();

  constructor()
  {
    super();
    this.makeSheet();
  }

  makeSheet()
  {
    const mainWidth = 40;
    const mainHeight = 0.3;
    const mainDepth = SHEET_LENGTH;
    const mainColor = 0xEEEEEE;
    
    const blueCylinderRadius = houseRadius;
    const whiteCylinderRadius = 25/2/2;
    const redCylinderRadius = 15/2/2;
    const centerCylinderRadius = 5/4;

    this.housePos = new THREE.Vector3(0, 0, mainDepth*0.35);    
    
    var sheet = new THREE.Group();
    
    const mainGeometry = new THREE.BoxGeometry( mainWidth, mainHeight, mainDepth );
      const mainMaterial = new THREE.MeshPhongMaterial( {color: mainColor} );
      const main = new THREE.Mesh( mainGeometry, mainMaterial );
    this.add(main);
    
    function makeCylinder(radius, color)
    {
      const cylinderOffsetY = mainHeight/2;
      const cylinderOffsetZ = mainDepth*0.35;
      
      var cylinderGeometry = new THREE.CylinderGeometry( radius, radius, 0.01, 64);
      var cylinderMaterial = new THREE.MeshPhongMaterial( {color: color, side:THREE.DoubleSide, flatShading: false} );
      var cylinder = new THREE.Mesh( cylinderGeometry, cylinderMaterial );
      cylinder.position.set(0, cylinderOffsetY, cylinderOffsetZ);
      return cylinder;
    }
    
    const blueCylinder = makeCylinder(blueCylinderRadius, 0x0000ff);
    this.add(blueCylinder);
    
    const whiteCylinder = makeCylinder(whiteCylinderRadius, 0xffffff);
    this.add(whiteCylinder);
    
    const redCylinder = makeCylinder(redCylinderRadius, 0xff0000);
    this.add(redCylinder);
    
    const centerCylinder = makeCylinder(centerCylinderRadius, 0xffffff);
    this.add(centerCylinder);

    
    return sheet;

    // Pour éviter les artéfacts, il faut éviter les superpositions de surfaces. Augmenter le décalage d'un epsilon fonctionne avec une distance de vue raisonnable.
    // Plus la caméra s'éloigne de la maison, plus l'epsilon devra être grand, car les longueurs sont aplaties avec la distance.
    // Solution -> CSG. À implémenter.
  }
}

function init()
{
  const clock = new THREE.Clock();
  const container = document.getElementById("webgl");

  // Renderer
  const renderer = new THREE.WebGLRenderer( {antialias: true} );
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize( window.innerWidth - 20, window.innerHeight - 100 );
    renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild( renderer.domElement );

  // Scène
  const scene = new THREE.Scene();
    scene.background = new THREE.Color( 0xbfe3dd );

  // Caméra
  const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.01, 1000);
    camera.position.set(5, 2, 8);

  // Contrôles de la caméra
  const controls = new THREE.OrbitControls( camera, renderer.domElement );
    controls.update();
    controls.enablePan = false;
    controls.enableDamping = true;

  // Axes
  /*let axes = new THREE.AxesHelper(1);
    scene.add(axes);*/

  // Lumière
  const ambLight = new THREE.AmbientLight(0x404040, 1);
    ambLight.position.set(0, 0, 100);
  const pointLight = new THREE.PointLight(0x404040, 5);
    pointLight.position.set(0, 50, 5);
  scene.add(ambLight, pointLight);

  // Gestion du tour en cours et des équipes
  var currentTeam = 0; // Prend la valeur 0 ou 1
  var teamColors = [BLUE_TEAM_COLOR, RED_TEAM_COLOR];
  var teamScores = [0, 0];

  // Liste des pierres
  var stones = [];
  var currentStone;

  // Les deux balais
  var brooms = [ new Broom(teamColors[0], scene), new Broom(teamColors[1], scene) ];
  var currentBroom;

  // Paramètres pour le lancer
  var launchParam = new function()
  {
    this.type = "Courbe";
    this.velocity = new THREE.Vector3(30, 0.0, 0);
    this.curvature = 1.0;

    this.dir = 0.0;
    this.velocityLinear = 50.0;
  }

  // Ajout des objets géométriques statiques à la scène
  var sheet = new Sheet();
  sheet.position.set(80 / 2.5, -STONE_HEIGHT / 2, 0);
  sheet.rotateOnAxis(new THREE.Vector3(0, 1, 0), Math.PI / 2);
  var housePosition = sheet.housePos.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2).add(sheet.position);
  housePosition.y = 0;
  scene.add(sheet);
  controls.target.copy(new THREE.Vector3().lerp(housePosition, 0.5));

  // Courbe de prévisualisation du lancer "en courbe"
  var launchCurve;
  var launchLine;

  // Courbe de prévisualisation du lancer "linéaire"
  var launchLinearCurve;
  var launchLinearLine;

  // GUIs
  // On utilisera les propriétés intrinsèques des objets quand cela est possible (lumière). Sinon, la fonction launchParam() contient
  // les paramètres nécessaires au lancement d'une pierre.
  var gui = new dat.GUI();
    // Lumières
    var guiLights = gui.addFolder("Lumières");
      guiLights.add(ambLight, "intensity", 0, 10).name("Ambiante");
      guiLights.add(pointLight, "intensity", 0, 10).name("Point");
    // Lancement de la pierre
    var guiLaunch = gui.addFolder("Lancement de la pierre");
        guiLaunch.add(launchParam, "type", ["Courbe", "Linéaire"]).name("Type de lancer").onChange(UpdateLaunchingCurve);
          var guiLaunchCurve = guiLaunch.addFolder("Courbe");
            var guiLaunchVelocity = guiLaunchCurve.addFolder("Vitesse initiale");
              guiLaunchVelocity.add(launchParam.velocity, "x", 0.0, 30.0).onChange(UpdateLaunchingCurve);
              guiLaunchVelocity.add(launchParam.velocity, "z", -30.0, 30.0).onChange(UpdateLaunchingCurve);
              guiLaunchVelocity.open();
            guiLaunchCurve.add(launchParam, "curvature", 0.01, 2).name("Courbure").onChange(UpdateLaunchingCurve);
          var guiLaunchLinear = guiLaunch.addFolder("Linéaire");
            guiLaunchLinear.add(launchParam, "dir", -1.0, 1.0).name("Direction").onChange(UpdateLaunchingCurve);
            guiLaunchLinear.add(launchParam, "velocityLinear", 1.0, 100.0).name("Vitesse").onChange(UpdateLaunchingCurve);
    // Jouer / activer les balais
    var guiPlay = gui.addFolder("Jouer !");
      guiPlay.add({ button:LaunchStone }, "button").name("Lancer la pierre");
      var guiUseBroomButton = guiPlay.add({ button:UseBroom }, "button").name("ERREUR"); // Le nom ici n'est pas sensé rester, car currentStone n'existe pas à cette ligne de code.

  guiLaunch.open();
  guiPlay.open();

  
  tick();
  function tick() // Boucle principale, s'execute à chaque tick/frame
  {
    requestAnimationFrame(tick);
    const delta = clock.getDelta();

    // Instructions d'animation

    // Condition pour créer une nouvelle pierre :
    // Aucune pierre n'a été créée, OU
    // (La pierre actuellement référencée a été lancée ET elle n'est plus en mouvement)
    if(!currentStone || (!currentStone.isMoving() && currentStone.launched))
    {
      UpdateScores(); // Gestion des scores

      if(currentStone) // Cette condition est fausse lorsqu'on crée la première pierre ; on s'en sert donc pour effectuer des réglages sur la pierre qui vient de finir son trajet.
      {
        currentTeam = (currentTeam + 1) % 2; // On passe à l'équipe suivante
        currentStone.movementType = "Linéaire"; // On passe la pierre à "Linéaire" pour qu'elle puisse gérer les collisions d'elle-même et qu'elle ne suive plus sa courbe.
        currentStone.useBroom(false); // On désactive la diminution de la friction (la friction est à "normalFriction" pour les prochains calculs de trajectoires, par ex chocs)
        brooms[0].detach(); // On détache les balais
        brooms[1].detach();
      }
      
      SetupNewStone(currentTeam); // Nouvelle pierre pour l'équipe suivante (ou la première équipe le cas échéant)
      UpdateBroomButton(); // On change le texte du bouton du balai : activé/désactivé selon le paramètre d'activation par défaut de la classe Stone

      UpdateLaunchingCurve();
    }

    // Actualisation des positions
    for(let i = 0 ; i < stones.length ; i++)
      stones[i].update(delta);
    
    for(let i = 0 ; i < brooms.length ; i++)
      brooms[i].update(delta);

    // Prise en compte des physiques pour les pierres en chute libre.
    // Une pierre suit une courbe pour sa trajectoire initiale, et passe en chute libre lorsqu'elle termine sa trajectoire,
    // ou alors quand elle entre en collision avec une autre pierre.
    CheckColls();

    // Le code ci-dessus, actualisant positions & physiques, est d'autant plus précis que le framerate est élevé.
    // En effet, plus le deltaTime est court, plus les déplacements infinitésimaux (dM) sont faibles.
    // Ceci est important, par exemple pour les angles d'incidences lors d'une collision. Plus la trajectoire est segmentée, plus l'angle
    // d'incidence s'éloignera de celui que l'on aura dans le cas d'une trajectoire courbe, à laquelle le vecteur d'incidence est tangent.
    // Un physics update à temps fixe permet également une meilleure répétabilité des résultats, notamment dans une configuration chaotique.
    // Actuellement, la physique est donc dépendante du framerate et donc de la puissance du client.
    // On peut fixer un temps d'actualisation des physiques à un epsilon, et répéter le code ci-dessus avec un deltaTime fixe (epsilon),
    // jusqu'à atteindre le deltaTime réel imposé par la puissance du client. A 60 fps, le résultat est plus qu'acceptable.
    // On pourrait néanmoins fixer un epsilon = 0.01 secondes par exemple (équivalent à 100 fps), pour que la physique soit identique peu importe
    // la puissance du client. Inutile d'aller jusque là, ce n'est pas un moteur 3D. Nous supposerons que le client possède
    // une puissance de calcul suffisante.

    // Fin des instructions d'animation

    // Affichage de la nouvelle frame, prenant en compte les nouvelles positions.
    controls.update();
    renderer.render(scene, camera);
  }

  function UpdateLaunchingCurve()
  {
    scene.remove(launchLine);

    launchCurve = MakeLaunchingCurve(launchParam.velocity, launchParam.curvature);
    launchLine = LineFromBezier(launchCurve, 50, teamColors[currentTeam]);

    scene.remove(launchLinearLine);

    launchLinearCurve = MakeLaunchingLinearCurve(launchParam.dir, launchParam.velocityLinear);
    launchLinearLine = LineFromLineCurve3(launchLinearCurve, teamColors[currentTeam]);

    if(launchParam.type == "Courbe")
    {
      scene.add(launchLine);

      guiLaunchCurve.open();
      guiLaunchLinear.close();

      guiLaunchCurve.domElement.style.pointerEvents = "";
      guiLaunchCurve.domElement.style.opacity = 1;

      guiLaunchLinear.domElement.style.pointerEvents = "none";
      guiLaunchLinear.domElement.style.opacity = .6;
    }
    else if(launchParam.type == "Linéaire")
    {
      scene.add(launchLinearLine);
      
      guiLaunchLinear.open();
      guiLaunchCurve.close();

      guiLaunchLinear.domElement.style.pointerEvents = "";
      guiLaunchLinear.domElement.style.opacity = 1;

      guiLaunchCurve.domElement.style.pointerEvents = "none";
      guiLaunchCurve.domElement.style.opacity = .6;
    }
  }

  function MakeLaunchingCurve(velocity, curvature)
  {
    let A = new THREE.Vector3();
    let B = new THREE.Vector3();
    let C = new THREE.Vector3();

    A.set(0, 0, 0);
    B.copy(velocity);
    C.copy(A);
    C.lerp(housePosition, 1 / curvature);

    return new THREE.QuadraticBezierCurve3(A, B, C);
  }

  function LineFromBezier(bez, precision, color)
  {
    const material = new THREE.LineBasicMaterial({ color: color });
    const points = bez.getPoints(precision);
    const geometry = new THREE.BufferGeometry().setFromPoints( points );
    const line = new THREE.Line( geometry, material );

    return line;
  }

  function MakeLaunchingLinearCurve(dir, scalar)
  {
    let A = new THREE.Vector3(0, 0, 0);
    let B = ComputeLaunchLinearSpeedVector();

    return new THREE.LineCurve3(A, B);
  }

  function LineFromLineCurve3(curve, color)
  {
    const material = new THREE.LineBasicMaterial({ color: color });
    
    const points = [];
    points.push( curve.v1, curve.v2 );
    
    const geometry = new THREE.BufferGeometry().setFromPoints( points );
    
    return new THREE.Line( geometry, material );
  }

  function SetupNewStone(team)
  {
    var stone = new Stone(STONE_RADIUS, teamColors[team], new THREE.Vector3(0, 0, 0), team);
    stones.push(stone);
    currentStone = stone;
    currentBroom = brooms[team];
    scene.add(stone);
  }

  function LaunchStone()
  {
    if(!currentStone.isMoving())
    {
      if(launchParam.type == "Courbe")
      {
        currentStone.speed.copy(launchParam.velocity);
        currentStone.curve = launchCurve;
      }
      else if(launchParam.type == "Linéaire")
      {
        currentStone.speed = ComputeLaunchLinearSpeedVector();
      }

      currentStone.movementType = launchParam.type;
      brooms[currentStone.team].attachToStone(currentStone);
      brooms[currentStone.team].use(currentStone.use);
      currentStone.launched = true;
    }
  }

  function ComputeLaunchLinearSpeedVector()
  {
    return new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), -launchParam.dir * Math.PI / 2).multiplyScalar(launchParam.velocityLinear);
  }

  function UseBroom()
  {
    if(currentStone)
    {
      currentStone.useBroom(!currentStone.use);
      currentBroom.use(currentStone.use);
      UpdateBroomButton();
    }

    return this.use;
  }

  function UpdateBroomButton()
  {
    guiUseBroomButton.name(currentStone.use ? "<span style=\"color:green;font-weight:bold;\">Balais : ON</span>" : 
                                              "<span style=\"color:red;font-weight:bold;\">Balais : OFF</span>");
  }
  
  function CheckColls()
  {
    for(i = 0 ; i < stones.length ; i++)
    {
      for(j = i + 1 ; j < stones.length ; j++)
      {
        // Pour tout couple (stone[i], stone[j]) de stones x stones avec i < j :
        if(stones[i].isColliding(stones[j]))
        {
          // Traitement de la collision :
          ResolveColls(stones[i], stones[j]);
        }
      }
    }
  }

  function ResolveColls(a, b) // Résolution des chocs.
  {
    // Les deux pierres doivent passer en chute libre et abandonner leur mode "suivi d'une courbe" pour gérer correctement les chocs.
    a.setFreeFall();
    b.setFreeFall();

    // Le traitement des chocs est fastidieux lorsque les deux pierres sont en mouvement. Une solution, utilisée ici, est de se ramener dans le cas
    // où une pierre en mouvement heurte l'autre au repos. Si les vitesses sont différentes (extrême majorité des cas), on peut donc réduire le problème
    // à celui énoncé, en prenant la pierre la plus rapide comme référence, et traiter l'autre pierre comme étant immobile. On considèrera donc la pierre
    // "lente" comme immobile pour les calculs d'angles.

    var fastest; // La pierre la plus rapide

    if(a.speed.length() > b.speed.length())
    {
      fastest = a;
      slowest = b;
    }
    else
    {
      fastest = b;
      slowest = a;
    }
    
    // On annule le dernier mouvement qui a conduit à une superposition des deux pierres, pour éviter une collision infinie.
    // Puisque la plus lente est considérée comme immobile, inutile d'annuler son déplacement (d'ailleurs, cela provoque souvent des superpositions indésirées).
    fastest.cancelLastMovement();

    // La quantité de mouvement est CONSTANTE au voisinnage du choc. Les masses étant égales, la quantité de vitesse est également constante.
    var sTot = fastest.speed.clone().add(slowest.speed); // Quantité de vitesse avant le choc (et donc aussi APRÈS le choc).
    var distFS = slowest.position.clone().sub(fastest.position); // Vecteur (Plus rapide -> Moins rapide)
    
    var slowestNewSpeed; // La vitesse de la pierre la plus lente après le choc.
      slowestNewSpeed = distFS.clone().normalize();
      slowestNewSpeed.applyAxisAngle(new THREE.Vector3(0, 1, 0), -distFS.angleTo(fastest.speed));
      slowestNewSpeed = distFS.clone().normalize();
      slowestNewSpeed.multiplyScalar(fastest.speed.length() * 0.85); // Choix de la nouvelle vitesse (en norme) de slowest grâce à un coefficient k.

    // Comme la vitesse totale doit être conservée, on déduit la nouvelle valeur pour fastest grâce à la nouvelle valeur de lowest :
    var fastestNewSpeed = sTot.clone().sub(slowestNewSpeed);

    fastest.speed = fastestNewSpeed;
    slowest.speed = slowestNewSpeed;
  }

  function UpdateScores()
  {
    teamScores  = [0, 0];

    for(var i = 0 ; i < stones.length ; i++)
    {
      let s = stones[i].position.clone();

      if(stones[i].position.distanceTo(housePosition) < houseRadius + stones[i].radius)
        teamScores[stones[i].team]++;
    }

    WriteScoresHTML();
  }

  function WriteScoresHTML()
  {
    var tableTd = [];
    tableTd.push(document.getElementsByTagName('table')[0].getElementsByTagName('tr')[1].getElementsByTagName('td')[1]);
    tableTd.push(document.getElementsByTagName('table')[0].getElementsByTagName('tr')[1].getElementsByTagName('td')[2]);

    var color;

    if(teamScores[0] > teamScores[1])
      color = BLUE_TEAM_COLOR;
    else if(teamScores[1] > teamScores[0])
      color = RED_TEAM_COLOR;
    else
      color = 0x777777;

    colorStr = color.toString(16);
    while(colorStr.length < 6)
      colorStr = "0" + colorStr;


    tableTd[0].innerHTML = "<span style=\"color:#" + colorStr + ";\">" + teamScores[0] + "</span>";
    tableTd[1].innerHTML = "<span style=\"color:#" + colorStr + ";\">" + teamScores[1] + "</span>";
  }
}