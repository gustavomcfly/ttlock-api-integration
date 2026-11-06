// Rede de segurança: garante que o usuário nunca veja mensagens técnicas do
// navegador ou textos em chinês. As mensagens da TTLock já são traduzidas no
// servidor (server/utils/ttlockErrors.js); isto cobre o que escapar.
const CJK = /[\u3400-\u9fff\uf900-\ufaff]/;
const NETWORK = /failed to fetch|networkerror|load failed|network request failed/i;
const BAD_JSON = /unexpected (token|end of json)|not valid json/i;

export function localizeMessage(message) {
  const text = String(message ?? "");
  if (CJK.test(text)) return "Ocorreu um erro inesperado. Tente novamente.";
  if (NETWORK.test(text)) return "Falha de conexão com o servidor.";
  if (BAD_JSON.test(text)) return "Resposta inválida do servidor.";
  return text;
}
