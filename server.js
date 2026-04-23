const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

process.on('unhandledRejection', (reason) => {
	console.error('unhandledRejection:', reason);
});
process.on('uncaughtException', (err) => {
	console.error('uncaughtException:', err);
});

dotenv.config();

const app = express();

// Cho phep goi API tu trang chay tren port khac (Live Server) hoac nguon khac
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.static('public'));
app.use(express.json());

app.use('/api', require('./routes/video'));

const PORT = process.env.PORT || 3000;

connectDB()
	.then(() => {
		app.listen(PORT, () => console.log(`Server chay port ${PORT}`));
	})
	.catch((err) => {
		console.error('Khong the khoi dong:', err.message || err);
		process.exit(1);
	});