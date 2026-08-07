import { Router } from "express";
import { authService } from "../services/auth.service.js";
import { userService } from "../services/user.service.js";

const router = Router();

router.post("/token", async (req, res) => {
  try {
    const data = await authService.authenticate(req.body);

    // Se o login na TTLock funcionou, garante um registro local de usuário
    // (falha aqui nunca deve impedir o login — ver userService.ensureUser).
    let localUser = null;
    if (data.access_token) {
      localUser = await userService.ensureUser(req.body.username);
    }

    res.json({
      ...data,
      localUserId: localUser?.id || null,
      localUsername: localUser?.username || null,
    });
  } catch (error) {
    res
      .status(500)
      .json(error.response?.data || { error: "Erro ao autentificar" });
  }
});

export default router;
