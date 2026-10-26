import prisma from '../prismaClient.js';

// A TTLock/Sciener não nos dá um "usuário local" — só autentica. Este serviço garante
// que exista uma linha em User para cada username que já fez login, para podermos
// relacionar CyclicTest, QualityAudit e Report a "quem" rodou o teste.
//
// Sem tolerância a falhas de propósito: se não der para gravar o usuário, o login
// deve falhar. Antes o erro era engolido e o teste era salvo sem dono (userId nulo).
export const userService = {
  async ensureUser(username, name) {
    if (!username) throw new Error('username obrigatório');
    return prisma.user.upsert({
      where: { username },
      update: name ? { name } : {},
      create: { username, name: name || null },
    });
  },

  async getByUsername(username) {
    return prisma.user.findUnique({ where: { username } });
  },
};
