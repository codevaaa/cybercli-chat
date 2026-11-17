import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { CompanionActivity } from '../shared/contracts.js'

interface CompanionModel3DProps {
  activity: CompanionActivity
  onFallback: () => void
}

type PetRig = {
  character: THREE.Group
  leftArm: THREE.Object3D
  rightArm: THREE.Object3D
  leftEye: THREE.Mesh
  rightEye: THREE.Mesh
  shell: THREE.MeshStandardMaterial
  face: THREE.MeshPhysicalMaterial
  eye: THREE.MeshStandardMaterial
  halo: THREE.MeshStandardMaterial
  haloSoft: THREE.MeshStandardMaterial
  firstOrbit: THREE.Mesh
  secondOrbit: THREE.Mesh
}

const sphere = (radius = 1) => new THREE.SphereGeometry(radius, 28, 20)

function makeMesh<T extends THREE.Material>(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: T,
  position: [number, number, number],
  scale: [number, number, number],
) {
  const result = new THREE.Mesh(geometry, material)
  result.position.set(...position)
  result.scale.set(...scale)
  parent.add(result)
  return result
}

function buildPet(scene: THREE.Scene): PetRig {
  scene.add(new THREE.HemisphereLight('#e8f3ed', '#38231e', 2.15))
  const keyLight = new THREE.DirectionalLight('#ffe1ca', 3.2)
  keyLight.position.set(-3, 4, 5)
  scene.add(keyLight)
  const rimLight = new THREE.PointLight('#e98763', 18, 8)
  rimLight.position.set(2.8, 1.2, 2)
  scene.add(rimLight)

  const shell = new THREE.MeshStandardMaterial({ color: '#d97757', metalness: 0.48, roughness: 0.31 })
  const shellLight = new THREE.MeshStandardMaterial({ color: '#f2a27c', metalness: 0.34, roughness: 0.35 })
  const shellDark = new THREE.MeshStandardMaterial({ color: '#8f4937', metalness: 0.44, roughness: 0.39 })
  const face = new THREE.MeshPhysicalMaterial({ color: '#171b18', metalness: 0.36, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.12 })
  const eye = new THREE.MeshStandardMaterial({ color: '#a9ead4', emissive: '#64d9b5', emissiveIntensity: 0.75, roughness: 0.2 })
  const eyeShine = new THREE.MeshBasicMaterial({ color: '#f2fff9' })
  const accent = new THREE.MeshStandardMaterial({ color: '#ffe0c9', emissive: '#e88b66', emissiveIntensity: 0.28, metalness: 0.38, roughness: 0.3 })
  const mouthMaterial = new THREE.MeshBasicMaterial({ color: '#b0efd9' })
  const blush = new THREE.MeshStandardMaterial({ color: '#ef947b', transparent: true, opacity: 0.68, roughness: 0.75 })
  const orbitMaterial = new THREE.MeshStandardMaterial({ color: '#e99472', metalness: 0.52, roughness: 0.36, transparent: true, opacity: 0.68 })
  const orbitSoftMaterial = new THREE.MeshStandardMaterial({ color: '#f5d7bf', metalness: 0.36, roughness: 0.4, transparent: true, opacity: 0.36 })

  const stage = new THREE.Group()
  scene.add(stage)
  const firstOrbit = new THREE.Mesh(new THREE.TorusGeometry(1.14, 0.016, 8, 96), orbitMaterial)
  firstOrbit.rotation.set(1.04, -0.12, -0.4)
  firstOrbit.position.z = -0.08
  stage.add(firstOrbit)
  const secondOrbit = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.011, 8, 96), orbitSoftMaterial)
  secondOrbit.rotation.set(0.92, 0.38, 0.58)
  secondOrbit.position.z = -0.1
  stage.add(secondOrbit)
  const satellite = makeMesh(firstOrbit, sphere(0.075), accent, [1.13, 0.04, 0], [1, 1, 1])
  satellite.material = accent

  const character = new THREE.Group()
  stage.add(character)

  // A soft enamel body with small ear fins keeps the silhouette distinct at pet-window scale.
  const body = makeMesh(character, sphere(0.8), shell, [0, -0.06, 0], [0.91, 0.94, 0.72])
  body.castShadow = false
  makeMesh(character, sphere(0.24), shellDark, [-0.69, 0.52, -0.04], [0.72, 1.05, 0.7])
  makeMesh(character, sphere(0.24), shellDark, [0.69, 0.52, -0.04], [0.72, 1.05, 0.7])
  makeMesh(character, sphere(0.16), shellLight, [-0.69, 0.53, 0.08], [0.58, 0.86, 0.52])
  makeMesh(character, sphere(0.16), shellLight, [0.69, 0.53, 0.08], [0.58, 0.86, 0.52])

  makeMesh(character, sphere(0.58), face, [0, 0.14, 0.52], [0.92, 0.68, 0.25])
  const leftEye = makeMesh(character, sphere(0.1), eye, [-0.2, 0.2, 0.72], [0.64, 0.93, 0.54])
  const rightEye = makeMesh(character, sphere(0.1), eye, [0.2, 0.2, 0.72], [0.64, 0.93, 0.54])
  makeMesh(character, sphere(0.027), eyeShine, [-0.22, 0.23, 0.765], [1, 1, 0.55])
  makeMesh(character, sphere(0.027), eyeShine, [0.18, 0.23, 0.765], [1, 1, 0.55])
  makeMesh(character, sphere(0.075), blush, [-0.38, 0.01, 0.67], [1.25, 0.56, 0.48])
  makeMesh(character, sphere(0.075), blush, [0.38, 0.01, 0.67], [1.25, 0.56, 0.48])

  const smileCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.075, -0.02, 0.754),
    new THREE.Vector3(0, -0.075, 0.77),
    new THREE.Vector3(0.075, -0.02, 0.754),
  ])
  character.add(new THREE.Mesh(new THREE.TubeGeometry(smileCurve, 18, 0.012, 8, false), mouthMaterial))
  makeMesh(character, sphere(0.105), accent, [0, 0.88, 0.04], [0.64, 0.73, 0.64])
  makeMesh(character, sphere(0.047), new THREE.MeshBasicMaterial({ color: '#fff1df' }), [0.02, 0.91, 0.117], [0.8, 0.8, 0.8])

  const leftArm = new THREE.Group()
  leftArm.position.set(-0.67, -0.19, 0.03)
  character.add(leftArm)
  makeMesh(leftArm, sphere(0.23), shell, [-0.07, -0.08, 0], [0.74, 1.12, 0.7])
  makeMesh(leftArm, sphere(0.11), shellLight, [-0.1, -0.28, 0.09], [1, 0.92, 0.84])
  const rightArm = new THREE.Group()
  rightArm.position.set(0.67, -0.19, 0.03)
  character.add(rightArm)
  makeMesh(rightArm, sphere(0.23), shell, [0.07, -0.08, 0], [0.74, 1.12, 0.7])
  makeMesh(rightArm, sphere(0.11), shellLight, [0.1, -0.28, 0.09], [1, 0.92, 0.84])

  makeMesh(character, sphere(0.19), shellDark, [-0.29, -0.77, 0.04], [0.82, 1.05, 0.78])
  makeMesh(character, sphere(0.19), shellDark, [0.29, -0.77, 0.04], [0.82, 1.05, 0.78])
  makeMesh(character, sphere(0.17), shellLight, [-0.31, -0.89, 0.11], [1.05, 0.64, 0.9])
  makeMesh(character, sphere(0.17), shellLight, [0.31, -0.89, 0.11], [1.05, 0.64, 0.9])
  makeMesh(character, sphere(0.1), accent, [0, -0.39, 0.654], [0.8, 0.8, 0.48])

  return { character, leftArm, rightArm, leftEye, rightEye, shell, face, eye, halo: orbitMaterial, haloSoft: orbitSoftMaterial, firstOrbit, secondOrbit }
}

export default function CompanionModel3D({ activity, onFallback }: CompanionModel3DProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const rigRef = useRef<PetRig | null>(null)
  const activityRef = useRef(activity)
  const requestFrameRef = useRef<(() => void) | null>(null)

  useEffect(() => { activityRef.current = activity }, [activity])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
    } catch {
      onFallback()
      return
    }

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50)
    camera.position.set(0, 0.04, 4.45)
    camera.lookAt(0, -0.02, 0)
    renderer.setClearColor(0x000000, 0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.12
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35))
    renderer.domElement.setAttribute('aria-hidden', 'true')
    renderer.domElement.setAttribute('role', 'presentation')
    const onContextLost = (event: Event) => {
      event.preventDefault()
      onFallback()
    }
    renderer.domElement.addEventListener('webglcontextlost', onContextLost)
    host.appendChild(renderer.domElement)

    const rig = buildPet(scene)
    rigRef.current = rig
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frameId: number | null = null
    let disposed = false
    let active = document.visibilityState === 'visible'
    let previousTime = 0
    let moodStartedAt = 0
    let previousActivity = activityRef.current
    const clock = new THREE.Clock()

    const resize = () => {
      const { width, height } = host.getBoundingClientRect()
      if (width < 2 || height < 2) return
      renderer.setSize(Math.round(width), Math.round(height), false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      requestRender()
    }

    const observer = new ResizeObserver(resize)
    observer.observe(host)

    const render = () => {
      frameId = null
      if (disposed || !active) return
      const time = clock.getElapsedTime()
      const delta = Math.min(0.05, previousTime ? time - previousTime : 0.016)
      previousTime = time
      const current = activityRef.current
      if (current !== previousActivity) {
        previousActivity = current
        moodStartedAt = time
      }

      const busy = current === 'working' || current === 'thinking'
      const speed = busy ? 1.55 : 1
      const rigCharacter = rig.character
      rigCharacter.position.y = Math.sin(time * 1.55 * speed) * (busy ? 0.075 : 0.045)
      rigCharacter.rotation.y = Math.sin(time * 0.6) * (busy ? 0.14 : 0.08)
      rigCharacter.rotation.z = current === 'error' ? -0.1 : current === 'approval' ? 0.075 : Math.sin(time * 0.75) * 0.018
      rig.leftArm.rotation.z = Math.sin(time * (busy ? 5.5 : 1.8)) * (busy ? 0.24 : 0.08)
      rig.rightArm.rotation.z = -rig.leftArm.rotation.z
      rig.firstOrbit.rotation.z += delta * (busy ? 0.62 : 0.2)
      rig.secondOrbit.rotation.z -= delta * (busy ? 0.44 : 0.14)
      if (current === 'completed' && time - moodStartedAt < 1.1) {
        rigCharacter.position.y += Math.max(0, Math.sin((time - moodStartedAt) * Math.PI * 2.4)) * 0.17
      }

      const errorMood = current === 'error'
      const approvalMood = current === 'approval'
      rig.shell.color.set(errorMood ? '#bd695d' : '#d97757')
      rig.eye.color.set(approvalMood ? '#ffd490' : errorMood ? '#ffb49e' : '#a9ead4')
      rig.eye.emissive.set(approvalMood ? '#ed9b43' : errorMood ? '#de6552' : '#64d9b5')
      rig.face.roughness = current === 'thinking' ? 0.23 : 0.16
      rig.halo.color.set(approvalMood ? '#ffc568' : errorMood ? '#ed826e' : '#e99472')
      rig.haloSoft.color.set(approvalMood ? '#ffe0a5' : '#f5d7bf')
      const blink = Math.sin(time * 0.78 + 0.4) > 0.986 ? 0.16 : 1
      rig.leftEye.scale.y = 0.93 * blink
      rig.rightEye.scale.y = 0.93 * blink

      renderer.render(scene, camera)
      if (!reducedMotion.matches) requestRender()
    }

    function requestRender() {
      if (frameId === null && !disposed && active) frameId = requestAnimationFrame(render)
    }
    requestFrameRef.current = requestRender

    const onVisibilityChange = () => {
      active = document.visibilityState === 'visible'
      if (active) requestRender()
      else if (frameId !== null) {
        cancelAnimationFrame(frameId)
        frameId = null
      }
    }
    const onMotionChange = () => requestRender()
    document.addEventListener('visibilitychange', onVisibilityChange)
    reducedMotion.addEventListener('change', onMotionChange)
    resize()
    requestRender()

    return () => {
      disposed = true
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibilityChange)
      reducedMotion.removeEventListener('change', onMotionChange)
      if (frameId !== null) cancelAnimationFrame(frameId)
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose()
          const materials = Array.isArray(object.material) ? object.material : [object.material]
          materials.forEach((material) => material.dispose())
        }
      })
      renderer.dispose()
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost)
      renderer.domElement.remove()
      rigRef.current = null
      requestFrameRef.current = null
    }
  }, [onFallback])

  useEffect(() => {
    // Request a single redraw for reduced-motion users after an activity change.
    requestFrameRef.current?.()
  }, [activity])

  return <div className="companion-model" ref={hostRef} aria-hidden="true" />
}
