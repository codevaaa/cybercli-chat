import mongoose from 'mongoose'

const connectMongoDB = async () => {
  try {
    const uri = process.env.MONGODB_URI
    if (!uri) {
      console.warn('MONGODB_URI not set. MongoDB connection skipped.')
      return null
    }

    const conn = await mongoose.connect(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    })

    console.log(`MongoDB connected: ${conn.connection.host}`)
    return conn
  } catch (error) {
    console.error('MongoDB connection error:', error.message)
    // Don't exit - let the app run with degraded functionality
    return null
  }
}

export default connectMongoDB
