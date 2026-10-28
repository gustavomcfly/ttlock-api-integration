import { Router } from "express";
import { authService } from "../services/auth.service.js";
import { userService } from "../services/user.service.js";
import { signSession } from "../middleware/auth.js";

const router = Router();

router.post("/token", async (req, res) => {
  let data;
  try {
    data = await authService.authenticate(req.body);
  } catch (error) {
    return res
      .status(500)
      .json(error.response?.data || { error: "Erro ao autentificar" });
  }

  // Credenciais recusadas pela TTLock: repassa a resposta como veio.
  if (!data.access_token) return res.json(data);

  try {
    const user = await userService.ensureUser(req.body.username);
    res.json({
      ...data,
      localUserId: user.id,
      localUsername: user.username,
      // Sessão própria do sistema: é ela que identifica o dono dos testes e relatórios.
      sessionToken: signSession(user, data.expires_in),
    });
  } catch (error) {
    console.error("[Auth] Falha ao registrar/ler usuário local:", error);
    res.status(503).json({
      error: "Banco de dados indisponível",
      description:
        "Login na TTLock ok, mas não foi possível registrar o usuário no banco. Tente novamente.",
    });
  }
});

export default router;
