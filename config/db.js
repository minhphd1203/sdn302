const mongoose = require('mongoose');

async function connectDB() {
	const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
	if (!uri) {
		throw new Error('Thieu MONGO_URI (hoac MONGODB_URI) trong file .env');
	}
	await mongoose.connect(uri);
	console.log('MongoDB da ket noi');
}

module.exports = connectDB;
