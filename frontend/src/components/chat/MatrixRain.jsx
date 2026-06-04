import React, { useEffect, useRef } from 'react'

export default function MatrixRain({ color = '#FF0055' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let animationFrameId

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+~`|}{[]:;?><,./-='
    const fontSize = 14
    const columns = canvas.width / fontSize
    const drops = []
    
    for (let x = 0; x < columns; x++) {
      drops[x] = 1
    }

    const draw = () => {
      // Semi-transparent black background creates the trail effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Set the text color
      ctx.fillStyle = color
      ctx.font = `${fontSize}px monospace`
      
      for (let i = 0; i < drops.length; i++) {
        // Pick a random character
        const text = characters.charAt(Math.floor(Math.random() * characters.length))
        
        // Draw the character
        ctx.fillText(text, i * fontSize, drops[i] * fontSize)
        
        // Randomly reset drop to top, or keep falling
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0
        }
        drops[i]++
      }
      
      // Control animation speed (slower than 60fps for classic matrix look)
      setTimeout(() => {
        animationFrameId = requestAnimationFrame(draw)
      }, 50)
    }

    draw()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [color])

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 pointer-events-none opacity-40 z-0"
      style={{ background: 'black' }}
    />
  )
}
