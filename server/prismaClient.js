import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

// 1. Pega a URL do seu .env
const connectionString = process.env.DATABASE_URL;

// 2. Cria um "Pool" de conexão do PostgreSQL
const { Pool } = pg;
const pool = new Pool({ connectionString });

// 3. Passa o Pool para o adaptador do Prisma
const adapter = new PrismaPg(pool);

// 4. Inicializa o Prisma Client usando o adaptador!
const prisma = new PrismaClient({ adapter });

export default prisma;