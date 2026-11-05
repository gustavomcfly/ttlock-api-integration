import axios from "axios";

// Tradução das mensagens da API da TTLock (retornam em inglês/chinês).
// Fonte: https://euopen.ttlock.com/doc/api/error

const MESSAGES = {
  0: "Operação realizada com sucesso.",
  1: "A operação falhou.",
  [-3]: "Parâmetro inválido.",
  10000: "Credencial do aplicativo inválida (client_id não encontrado).",
  10001: "Cliente inválido: client_id ou client_secret incorretos.",
  10002: "Código de autorização inválido ou expirado.",
  10003: "Token de acesso inválido ou inexistente.",
  10004: "Autorização inválida: o token expirou ou foi revogado.",
  10005: "O token não tem permissão para este recurso.",
  10006:
    "Aplicativo não aprovado: apenas contas de teste específicas podem autorizar.",
  10007: "Usuário ou senha incorretos.",
  10008: "redirect_uri inválido: deve ser igual ao cadastrado no aplicativo.",
  10009: "Tipo de resposta (response_type) não suportado.",
  10010: "Tipo de concessão (grant_type) não suportado.",
  10011: "refresh_token inválido.",
  20000: "openid inválido.",
  20001: "O usuário não é o dono da chave desta fechadura.",
  20002: "O usuário não é administrador da fechadura.",
  20003:
    "Chave inválida: a relação entre chave, fechadura e usuário está incorreta.",
  20004: "Chave não encontrada.",
  20005: "Senha da chave de backup incorreta.",
  20006: "Destinatário não encontrado.",
  20007: "Versão de senha de teclado inválida (valores válidos: 1, 2, 3 ou 4).",
  20008: "Nome de fechadura inválido.",
  30001: "Sem permissão para acessar este recurso.",
  30002: "Nome de usuário inválido: use apenas letras e números.",
  30003: "Usuário já cadastrado.",
  30004: "ID de usuário inválido para exclusão.",
  30005: "O usuário não pertence ao aplicativo personalizado.",
  30006: "Limite de chamadas da API excedido. Tente novamente mais tarde.",
  80000:
    "Horário da requisição inválido: deve estar a até 5 minutos do horário atual.",
  80002: "Formato JSON inválido.",
  90000: "Erro interno no servidor da TTLock.",
  [-2012]: "A fechadura não está conectada a nenhum gateway.",
  [-2018]: "Permissão negada.",
  [-4056]: "Armazenamento da fechadura cheio. A operação falhou.",
  [-3003]: "O Gateway está ocupado processando outra requisição.",
  [-3037]:
    "O gateway está offline. Aguarde e tente novamente, se persistir, verifique a rede do gateway.",
  [-4043]: "Esta fechadura não suporta esta operação.",
  [-2018]: "Permissão negada.",
  [-4056]: "Armazenamento da fechadura cheio. A operação falhou.",
  [-2032]: "A senha é muito simples. Tente novamente com uma senha mais forte.",
  [-3006]: "A senha deve ter entre 4 e 9 digitos.",
};

// Traduz a resposta da TTLock (muta o objeto). Só age em respostas que trazem
// "errcode"; o texto original fica em errmsgOriginal para diagnóstico.

export function translateTTLockResponse(data) {
  if (!data || typeof data !== "object" || typeof data.errcode !== "number")
    return data;
  if (data.errmsg === undefined && data.description === undefined) return data;

  const known = MESSAGES[data.errcode];
  const message =
    known || `Erro retornado pela TTLock (código ${data.errcode}).`;
  if (!known) {
    console.warn(
      `[TTLock] errcode sem tradução ${data.errcode}: "${data.errmsg ?? ""}" / "${data.description ?? ""}"`,
    );
  }

  data.errmsgOriginal = data.errmsg;
  data.errmsg = message;
  if (data.description !== undefined) data.description = message;
  return data;
}

export function translateNetworkError(error) {
  const code = error?.code;
  const msg = String(error?.message || "");
  const status = error?.response?.status;

  if (code === "ECONNABORTED" || code === "ETIMEDOUT" || /timeout/i.test(msg))
    return "Tempo esgotado ao comunicar com a TTLock.";
  if (code === "ENOTFOUND" || code === "EAI_AGAIN")
    return "Não foi possível localizar o servidor da TTLock (verifique a conexão com a internet).";
  if (
    ["ECONNREFUSED", "ECONNRESET", "EPIPE"].includes(code) ||
    /network error|socket hang up/i.test(msg)
  )
    return "Falha de conexão com a TTLock.";
  if (status) return `A TTLock respondeu com erro HTTP ${status}.`;
  return null;
}

if (!globalThis.__ttlockErrorsRegistered) {
  globalThis.__ttlockErrorsRegistered = true;
  axios.interceptors.response.use(
    (response) => {
      translateTTLockResponse(response.data);
      return response;
    },
    (error) => {
      translateTTLockResponse(error?.response?.data);
      const friendly = translateNetworkError(error);
      if (friendly) error.message = friendly;
      return Promise.reject(error);
    },
  );
}
