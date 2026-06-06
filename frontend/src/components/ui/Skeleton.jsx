import { motion } from 'framer-motion'

export function Skeleton({ className = '', variant = 'text', width, height, ...props }) {
  const baseClasses = 'bg-black/10 dark:bg-white/5 overflow-hidden relative'
  
  const variants = {
    text: 'h-4 rounded-md w-full',
    circular: 'rounded-full',
    rectangular: 'rounded-xl',
  }

  return (
    <div 
      className={`${baseClasses} ${variants[variant]} ${className}`}
      style={{ width, height }}
      {...props}
    >
      <motion.div
        className="absolute inset-0 -translate-x-full"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
        }}
        animate={{
          translateX: ['-100%', '200%'],
        }}
        transition={{
          repeat: Infinity,
          duration: 1.5,
          ease: 'linear',
        }}
      />
    </div>
  )
}
