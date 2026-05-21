import { useEffect, useMemo, useState } from 'react'
import Particles, { initParticlesEngine } from '@tsparticles/react'
import { loadSlim } from '@tsparticles/slim'

export default function ParticleBackground() {
  const [init, setInit] = useState(false)

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine)
    }).then(() => setInit(true))
  }, [])

  const options = useMemo(
    () => ({
      fullScreen: { enable: false },
      particles: {
        number: {
          value: 60,
          density: { enable: true, value_area: 800 },
        },
        color: {
          value: ['#D97757', '#E8896A', '#B85D3D', '#F4A37A'],
        },
        shape: {
          type: 'circle',
        },
        opacity: {
          value: 0.5,
          random: true,
          anim: {
            enable: true,
            speed: 0.5,
            opacity_min: 0.1,
            sync: false,
          },
        },
        size: {
          value: 3,
          random: { enable: true, minimumValue: 1 },
          anim: {
            enable: true,
            speed: 2,
            size_min: 0.5,
            sync: false,
          },
        },
        line_linked: {
          enable: true,
          distance: 150,
          color: '#D97757',
          opacity: 0.08,
          width: 1,
        },
        move: {
          enable: true,
          speed: 0.8,
          direction: 'none',
          random: true,
          straight: false,
          outModes: {
            default: 'bounce',
          },
          attract: {
            enable: true,
            rotateX: 600,
            rotateY: 1200,
          },
        },
      },
      interactivity: {
        detectsOn: 'canvas',
        events: {
          onHover: {
            enable: true,
            mode: ['grab', 'repulse'],
          },
          onClick: {
            enable: true,
            mode: 'push',
          },
          resize: {
            enable: true,
          },
        },
        modes: {
          grab: {
            distance: 200,
            line_linked: {
              opacity: 0.25,
            },
          },
          repulse: {
            distance: 150,
            duration: 0.4,
          },
          push: {
            particles_nb: 2,
          },
        },
      },
      detectRetina: true,
      background: {
        color: 'transparent',
      },
    }),
    [],
  )

  if (!init) return <div className="absolute inset-0 bg-transparent" />

  return (
    <Particles
      id="tsparticles"
      options={options}
      className="absolute inset-0"
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}
    />
  )
}
