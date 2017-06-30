import {
  PerspectiveCamera,
  Scene,
  Vector2,
  WebGLRenderer,
  PCFSoftShadowMap,
  Object3D,
  Geometry,
  Shape,
  ShaderMaterial,
  Mesh,
  MeshLambertMaterial,
  MeshFaceMaterial,
  ExtrudeGeometry,
  Color,
  FrontSide,
  VertexColors,
  DirectionalLight
} from 'three'
import THREETUT from './shader'

class BuildingShape {

  constructor (options, json) {
    this.options = options
    //Due to javascripts limitations we need to parse the data in subsets (5000)
    this.shapeCount = 0
    this.shapes = []
    this.subset_size = 5000
    this.fast = false
    this.init(json)
  }

  init (json) {
    //Initiate js
    this.camera = new PerspectiveCamera(50, (window.innerWidth / window.innerHeight), 1, 1000)
    this.camera.position.set(0, 100, 500)
    this.scene = new Scene()
    this.mouse = new Vector2()


    //Initiate Renderer

    this.renderer = new WebGLRenderer({antialias: false, preserveDrawingBuffer: true, alpha: true})
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = PCFSoftShadowMap
    this.renderer.setViewport(0, 0, window.innerWidth, window.innerHeight)


    //This group will hold our objects for easier handling
    this.group = new Object3D()
    this.group.position.y = 50
    this.group.position.z = 0
    this.scene.add(this.group)

    //This group will hold all geometries
    this.groupGeometry = new Geometry()

    console.log('initiation done')
    //Lets go and build the objects based on the geoJson data
    this.buildShape(json)
  }

  buildShape (json) {
    console.log('buildShape (' + this.shapeCount + '/' + json.features.length + ')')
    if (this.shapeCount < json.features.length) {
      let shapeSession = 0
      for (let s = this.shapeCount; s < json.features.length && shapeSession < this.subset_size; s++) {
        shapeSession++
        this.shapeCount++
        let good = true
        let points = []
        //Check if the geometry has at least two coordinates
        if (json.features[s].geometry.coordinates.length < 1 || json.features[s].geometry.coordinates[0] < 1) {
          good = false
        } else {
          for (let i = 0; i < json.features[s].geometry.coordinates[0].length; i++) {
            //Check for weird values
            if (json.features[s].geometry.coordinates[0][i][0] && json.features[s].geometry.coordinates[0][i][1] && json.features[s].geometry.coordinates[0][i][0] > 0 && json.features[s].geometry.coordinates[0][i][1] > 0) {
              points.push(new Vector2(this.options.translateLat(json.features[s].geometry.coordinates[0][i][0]), this.options.translateLng(json.features[s].geometry.coordinates[0][i][1])))
            } else {
              good = false
            }
          }
        }

        //If the geometry is safe, continue
        let h = this.options.heightFn(json.features[s].properties[this.options.heightAttr])
        if (good) {
          //Calculate the height of the current geometry for extrusion
          if (isNaN(parseFloat(json.features[s].properties[this.options.heightAttr]))) {
            if (this.fast) {
              good = false
            }
            h = 0
          }
          if (!h || h < 0) {
            if (this.fast) {
              good = false
            }
            h = 0
          }
          if (h > this.options.max) {
            h = this.options.max
          }
          //Remove all objects that have no height information for faster rendering
          if (h == 0 && this.fast) {
            good = false
          }
        }
        //If the geometry is still safe, continue
        if (good) {
          //Calculate the third dimension
          let z = ((h / this.options.max) * this.options.z_max)
          if (!z || z < 1) {
            z = 0
          }
          //Calculate the color of the object
          //In this sample code we use a blue to red range to visualize the height of the object (blue short to red tall)
          let red = Math.round((h / this.options.max) * 255.0)
          let blue = Math.round(255.0 - (h / this.options.max) * 255.0)
          let color = new Color('rgb(' + red + ',0,' + blue + ')')

          this.addShape(new Shape(points), z * this.options.z_rel, color, 0, 50, 0, this.options.r, 0, 0, 1)
        }
      }

      //If we have more geometries to add restart the whole loop
      setTimeout(() => {
        this.buildShape(json)
      }, 100)
    } else {
      //We are done building our geometry
      console.log('Geometry Done')

      //Initiate the shader
      let shaderMaterial = new ShaderMaterial({
        attributes: {},
        uniforms: {},
        vertexShader: THREETUT.Shaders.Lit.vertex,
        fragmentShader: THREETUT.Shaders.Lit.fragment
        , side: FrontSide
      })

      //Initiate Material
      let materials = [
        new MeshLambertMaterial({
          vertexColors: VertexColors,
          color: 'rgb(0.2,0.2,0.2)',
          ambient: 'rgb(0.2,0.2,0.2)',
          shininess: 1,
          lights: true
        }),
        new MeshLambertMaterial({
          vertexColors: VertexColors,
          color: 'rgb(0.5,0.5,0.5)',
          ambient: 'rgb(0.5,0.5,0.5)',
          shininess: 1,
          lights: true
        })
      ]

      let material = new MeshFaceMaterial(materials)

      //Create a this.mesh from the geometry
      this.mesh = new Mesh(this.groupGeometry, material)
      this.mesh.position.set(this.options.offset_x * 3, this.options.offset_y * 3, this.options.offset_z * 3)
      this.mesh.rotation.set(this.options.r, 0, 0)
      this.mesh.scale.set(this.options.scale_factor * this.options.scale_x, this.options.scale_factor * this.options.scale_y, 0)
      this.mesh.castShadow = true
      this.mesh.receiveShadow = true
      this.scene.add(this.mesh)

      //Too make it a little more fancy, add a directional light
      let directionalLight = new DirectionalLight(0xeeeeee, 1)
      directionalLight.position.set(0, 400, 200)
      directionalLight.target = this.mesh
      directionalLight.castShadow = true
      directionalLight.shadowDarkness = 0.5
      this.scene.add(directionalLight)

      //Now add the renderer to the DOM
      document.body.appendChild(this.renderer.domElement)

      //And start animating it
      console.log('animate')
      this.animate()
      //For rotating the 3D object we use the mouse movement
      this.renderer.domElement.addEventListener('mousemove', (evt) => {
        evt.preventDefault()
        this.mouse.x = ( event.clientX / window.innerWidth ) * Math.PI * 4
        this.mouse.y = ( event.clientY / window.innerHeight ) * Math.PI * 4
      }, false)
    }
  }

  addShape (shape, extrude, color, x, y, z, rx, ry, rz, s) {

    //Extrusion settings
    let extrudeSettings = {
      amount: extrude * 50,
      steps: 1,
      material: 0,
      extrudeMaterial: 1,
      bevelEnabled: false
    }

    //Create the geometry
    let geometry = new ExtrudeGeometry(shape, extrudeSettings)

    //Set the color for the object
    for (let f = 0; f < geometry.faces.length; f++) {
      geometry.faces[f].color.setRGB(color.r, color.g, color.b)
    }

    //Have a big amount of geometries will slow down js
    //Instead we merge all geometries into one geometry
    this.groupGeometry.merge(geometry, geometry.matrix)
  }

  animate () {
    //Animate at 30fs framerate
    setTimeout(() => {
      requestAnimationFrame(() => {
        //Animate and render the this.mesh
        this.mesh.rotation.x = this.mouse.y
        this.mesh.rotation.y = this.mouse.x

        //Animate the height of the objections
        if (this.options.animateHeight) {
          this.options.heightScaler += 0.001
        }
        const {scale_factor, scale_x, heightScaler, scale_y} = this.options
        this.mesh.scale.set(scale_factor * scale_x, scale_factor * scale_y, heightScaler)

        //Render the scene
        this.renderer.render(this.scene, this.camera)
      })
    }, 1000 / 30)
  }
}

export default BuildingShape