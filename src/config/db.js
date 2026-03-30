import mongoose from 'mongoose';

/**
 * Connects to MongoDB once per process. Call from application entry.
 */
export async function connectDb(uri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
}

export async function disconnectDb() {
  await mongoose.disconnect();
}
