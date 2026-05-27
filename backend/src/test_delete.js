import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import connectMongoDB from './config/database.js';
import Thread from './models/Thread.js';
import Message from './models/Message.js';

async function test() {
  await connectMongoDB();
  
  // Create a mock thread
  const userId = new mongoose.Types.ObjectId().toString();
  const thread = new Thread({
    user_id: userId,
    title: 'Test Thread to Delete',
    model_id: 'openrouter/gpt-4o-mini'
  });
  await thread.save();
  console.log('Created thread:', thread._id);
  
  // Create a mock message
  const message = new Message({
    thread_id: thread._id,
    user_id: userId,
    role: 'user',
    content: 'hello'
  });
  await message.save();
  console.log('Created message:', message._id);
  
  // Delete the thread
  const deletedThread = await Thread.findOneAndDelete({ _id: thread._id, user_id: userId });
  console.log('Deleted thread document:', deletedThread ? 'YES' : 'NO');
  
  const deletedMessages = await Message.deleteMany({ thread_id: thread._id });
  console.log('Deleted messages count:', deletedMessages.deletedCount);
  
  await mongoose.disconnect();
}

test();
