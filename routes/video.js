const express = require('express');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');

let ffmpegPath;
try {
	ffmpegPath = require('ffmpeg-static');
} catch {
	ffmpegPath = null;
}
if (ffmpegPath) {
	ffmpeg.setFfmpegPath(ffmpegPath);
} else {
	console.warn(
		'[video] Cai "ffmpeg-static" (npm i) hoac cai FFmpeg va them vao PATH de xu ly video.'
	);
}

const File = require('../models/File');

const router = express.Router();

const uploadsDir = path.join(__dirname, '..', 'uploads');
const outputsDir = path.join(__dirname, '..', 'outputs');

if (!fs.existsSync(uploadsDir)) {
	fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(outputsDir)) {
	fs.mkdirSync(outputsDir, { recursive: true });
}

const storage = multer.diskStorage({
	destination: (_req, _file, cb) => cb(null, uploadsDir),
	filename: (_req, file, cb) => {
		const ext = path.extname(file.originalname);
		const base = path.basename(file.originalname, ext).replace(/\s+/g, '-');
		cb(null, `${base}-${Date.now()}${ext}`);
	}
});

const upload = multer({ storage });

const updateFileById = (fileId, payload) => File.findByIdAndUpdate(fileId, payload, { new: true });

async function safeUpdateError(fileId) {
	try {
		await updateFileById(fileId, { status: 'error' });
	} catch (e) {
		console.error('[video] Loi ghi trang thai error:', e.message);
	}
}

const statAsync = promisify(fs.stat);

function resolveInputPath(filename) {
	const safeName = path.basename(filename || '');
	return path.join(uploadsDir, safeName);
}

function resolveOutputName(suffix) {
	return `${Date.now()}-${suffix}`;
}

async function ensureInputExists(filename) {
	const inputPath = resolveInputPath(filename);
	await statAsync(inputPath);
	return inputPath;
}

router.post('/upload', upload.single('video'), async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ success: false, error: 'Video file is required' });
		}

		const file = await File.create({
			originalName: req.file.filename,
			status: 'uploaded'
		});

		return res.json({
			success: true,
			fileId: file._id,
			filename: req.file.filename
		});
	} catch (error) {
		return res.status(500).json({ success: false, error: error.message });
	}
});

// Chuyen sang MP3
router.post('/to-mp3', async (req, res) => {
	const { filename, fileId } = req.body;

	if (!filename || !fileId) {
		return res.status(400).json({ success: false, error: 'filename and fileId are required' });
	}

	const outputName = resolveOutputName('output.mp3');
	const outputPath = path.join(outputsDir, outputName);

	try {
		const inputPath = await ensureInputExists(filename);

		await new Promise((resolve, reject) => {
			const cmd = ffmpeg(inputPath).toFormat('mp3');
			cmd.on('end', resolve);
			cmd.on('error', reject);
			cmd.save(outputPath);
		});

		await updateFileById(fileId, {
			outputName,
			type: 'mp3',
			status: 'done'
		});

		return res.json({ success: true, outputName });
	} catch (error) {
		await safeUpdateError(fileId);
		return res.status(500).json({ success: false, error: error.message });
	}
});

// Nen video
router.post('/compress', async (req, res) => {
	const { filename, fileId } = req.body;

	if (!filename || !fileId) {
		return res.status(400).json({ success: false, error: 'filename and fileId are required' });
	}

	const outputName = resolveOutputName('compressed.mp4');
	const outputPath = path.join(outputsDir, outputName);

	try {
		const inputPath = await ensureInputExists(filename);

		// Khong dung videoBitrate co dinh (vd. 500k): neu video goc nho hom,
		// muc tieu nay lam file SW lon hon. Dung CRF = giam theo chat luong, thuong nho hon.
		await new Promise((resolve, reject) => {
			const cmd = ffmpeg(inputPath)
				.format('mp4')
				.videoCodec('libx264')
				.audioCodec('aac')
				.outputOptions(['-crf 28', '-preset fast', '-movflags +faststart', '-b:a 96k']);
			cmd.on('end', resolve);
			cmd.on('error', reject);
			cmd.save(outputPath);
		});

		await updateFileById(fileId, {
			outputName,
			type: 'compress',
			status: 'done'
		});

		return res.json({ success: true, outputName });
	} catch (error) {
		await safeUpdateError(fileId);
		return res.status(500).json({ success: false, error: error.message });
	}
});

// Chup thumbnail
router.post('/thumbnail', async (req, res) => {
	const { filename, fileId } = req.body;

	if (!filename || !fileId) {
		return res.status(400).json({ success: false, error: 'filename and fileId are required' });
	}

	const outputName = resolveOutputName('thumb.png');

	try {
		const inputPath = await ensureInputExists(filename);

		await new Promise((resolve, reject) => {
			const cmd = ffmpeg(inputPath);
			cmd.on('end', resolve);
			cmd.on('error', reject);
			cmd.screenshots({
				timestamps: ['1'],
				filename: outputName,
				folder: outputsDir
			});
		});

		await updateFileById(fileId, {
			outputName,
			type: 'thumbnail',
			status: 'done'
		});

		return res.json({ success: true, outputName });
	} catch (error) {
		await safeUpdateError(fileId);
		return res.status(500).json({ success: false, error: error.message });
	}
});

// Lich su + download
router.get('/history', async (req, res) => {
	try {
		const history = await File.find().sort({ createdAt: -1 });
		return res.json(history);
	} catch (error) {
		return res.status(500).json({ success: false, error: error.message });
	}
});

router.get('/download/:filename', (req, res) => {
	const safeName = path.basename(req.params.filename || '');
	const outputPath = path.join(outputsDir, safeName);
	if (!fs.existsSync(outputPath)) {
		return res.status(404).json({ success: false, error: 'File not found' });
	}

	return res.download(outputPath);
});

module.exports = router;