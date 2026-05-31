import mongoose from 'mongoose'
import { patchMongoose, setFallbackMode } from '../utils/fallbackDb.js'

// Automatically patch Mongoose on import
patchMongoose()

const connectMongoDB = async () => {
  try {
    const uri = process.env.MONGODB_URI
    if (!uri) {
      console.warn('MONGODB_URI not set. MongoDB connection skipped.')
      setFallbackMode(true)
      return null
    }

    // Set bufferCommands to false so Mongoose won't hang if connection drops
    mongoose.set('bufferCommands', false)

    const conn = await mongoose.connect(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 3000, // Reduced from 5000 to fail faster
      socketTimeoutMS: 45000,
    })

    console.log(`MongoDB connected: ${conn.connection.host}`)
    setFallbackMode(false)
    return conn
  } catch (error) {
    console.error('MongoDB connection error:', error.message)
    // Activate local JSON database fallback
    setFallbackMode(true)
    return null
  }
}

// Add dynamic connection listeners for failover
mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error event. Activating fallback:', err?.message || err)
  setFallbackMode(true)
})

mongoose.connection.on('disconnected', () => {
  console.warn('Mongoose disconnected. Activating fallback.')
  setFallbackMode(true)
})

mongoose.connection.on('connected', () => {
  console.log('Mongoose connected. Deactivating fallback.')
  setFallbackMode(false)
})

export default connectMongoDB


