import prisma from '../prismaClient.js';

// A TTLock/Sciener não nos dá um "usuário local" — só autentica. Este serviço garante
// que exista uma linha em User para cada username que já fez login, para podermos
// relacionar CyclicTest/QualityAudit a "quem" rodou o teste.
//
// Propositalmente tolerante a falhas: se o banco não estiver acessível, o login
// continua funcionando normalmente (sem usuário local) em vez de derrubar a autenticação.
export const userService = {
  async ensureUser(username, name) {
    if (!username) return null;
    try {
      const user = await prisma.user.upsert({
        where: { username },
        update: name ? { name } : {},
        create: { username, name: name || null },
      });
      return user;
    } catch (err) {
      console.error('[userService] Não foi possível gravar/ler o usuário local:', err.message);
      return null;
    }
  },

  async getByUsername(username) {
    try {
      return await prisma.user.findUnique({ where: { username } });
    } catch (err) {
      return null;
    }
  },
};
