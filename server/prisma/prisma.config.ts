import dotenv from 'dotenv';
dotenv.config();

export default {
  migrate: {
    url: process.env.DATABASE_URL,
  },
};