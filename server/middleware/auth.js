import jwt from "jsonwebtoken";

// A TTLock só devolve um access_token opaco, sem dizer "quem" é o usuário local.
// Depois do login na TTLock o servidor emite uma sessão própria (JWT) com o id da
// linha em User. Toda rota que grava/lê dados de usuário usa esse id — nunca um
// userId enviado pelo navegador.
const SEVEN_DAYS = 7 * 24 * 60 * 60;

function getSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET não configurado no ambiente de produção.");
  }
  console.warn("[auth] JWT_SECRET ausente: usando segredo de desenvolvimento.");
  return "dev-only-insecure-secret";
}

export function signSession(user, expiresInSeconds) {
  const ttl = Number(expiresInSeconds) > 0 ? Number(expiresInSeconds) : SEVEN_DAYS;
  return jwt.sign({ sub: user.id, username: user.username }, getSecret(), {
    expiresIn: ttl,
  });
}

function unauthorized(res, message) {
  // Inclui os dois formatos de erro usados pelo projeto (success/message e errcode/errmsg).
  return res
    .status(401)
    .json({ success: false, message, errcode: -401, errmsg: message });
}

export function requireAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || "").split(" ");
  if (scheme !== "Bearer" || !token) {
    return unauthorized(res, "Sessão ausente. Faça login novamente.");
  }
  try {
    const payload = jwt.verify(token, getSecret());
    req.user = { id: payload.sub, username: payload.username };
    next();
  } catch (err) {
    return unauthorized(res, "Sessão inválida ou expirada. Faça login novamente.");
  }
}
