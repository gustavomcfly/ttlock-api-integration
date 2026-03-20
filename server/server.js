import 'dotenv/config';
import express from 'express';
import cors from 'cors';

// Import modular routes
import authRoutes from './routes/auth.routes.js';
import lockRoutes from './routes/lock.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

// Register base routes
app.use('/api/auth', authRoutes);
app.use('/api/lock', lockRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Proxy Server running at http://localhost:${PORT}`);
});