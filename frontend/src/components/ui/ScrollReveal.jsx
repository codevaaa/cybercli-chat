import { motion } from 'framer-motion'

const variants = {
  up: (delay) => ({
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1, y: 0,
      transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1], delay: delay || 0 }
    }
  }),
  down: (delay) => ({
    hidden: { opacity: 0, y: -30 },
    visible: {
      opacity: 1, y: 0,
      transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1], delay: delay || 0 }
    }
  }),
  left: (delay) => ({
    hidden: { opacity: 0, x: 40 },
    visible: {
      opacity: 1, x: 0,
      transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1], delay: delay || 0 }
    }
  }),
  right: (delay) => ({
    hidden: { opacity: 0, x: -40 },
    visible: {
      opacity: 1, x: 0,
      transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1], delay: delay || 0 }
    }
  }),
  scale: (delay) => ({
    hidden: { opacity: 0, scale: 0.88 },
    visible: {
      opacity: 1, scale: 1,
      transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: delay || 0 }
    }
  }),
  fade: (delay) => ({
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.55, ease: 'easeOut', delay: delay || 0 }
    }
  }),
}

/**
 * ScrollReveal — wraps children with a Framer Motion viewport trigger.
 *
 * @param {React.ReactNode} children
 * @param {'up'|'down'|'left'|'right'|'scale'|'fade'} direction
 * @param {number} delay  Delay in seconds
 * @param {string} className  Extra Tailwind classes
 * @param {boolean} once  Only animate once (default true)
 */
export default function ScrollReveal({
  children,
  direction = 'up',
  delay = 0,
  className = '',
  once = true,
  as: Tag = 'div',
  ...rest
}) {
  const MotionTag = motion[Tag] || motion.div
  const variant = variants[direction]?.(delay) || variants.up(delay)

  return (
    <MotionTag
      className={className}
      variants={variant}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: '-60px' }}
      {...rest}
    >
      {children}
    </MotionTag>
  )
}

/**
 * ScrollRevealGroup — stagger-animates child elements.
 * Wrap a list of items with this; pass `stagger` in seconds between items.
 */
export function ScrollRevealGroup({
  children,
  stagger = 0.08,
  direction = 'up',
  className = '',
  once = true,
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: '-60px' }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger } }
      }}
    >
      {Array.isArray(children)
        ? children.map((child, i) => (
            <motion.div
              key={i}
              variants={variants[direction]?.(0) || variants.up(0)}
            >
              {child}
            </motion.div>
          ))
        : children}
    </motion.div>
  )
}
