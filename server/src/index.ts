import dotenv from 'dotenv';
import { createApp } from './app';

dotenv.config();

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  console.error('Fatal: API_KEY environment variable is missing.');
  process.exit(1);
}

const app = createApp(API_KEY);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});