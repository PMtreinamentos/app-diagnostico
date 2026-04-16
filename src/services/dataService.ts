export async function saveToGoogleSheets(data: {
  timestamp: string;
  userName: string;
  whatsapp: string;
  email: string;
  gender: string;
  maritalStatus: string;
  age: string;
  income: string;
  inputText: string;
  diagnosis: any;
  pdfBase64?: string;
}) {
  const webhookUrl = import.meta.env.VITE_GOOGLE_SHEETS_WEBHOOK_URL;

  if (!webhookUrl || !webhookUrl.startsWith('http')) {
    console.error("ERRO: URL do Webhook do Google Sheets não configurada!");
    return;
  }

  // Remove o PDF do payload para evitar timeouts em redes móveis.
  // O PDF pode ser gerado novamente sob demanda; não precisa trafegar na rede.
  const { pdfBase64: _omitted, ...dataWithoutPdf } = data;

  const payloadSize = Math.round(JSON.stringify(dataWithoutPdf).length / 1024);
  console.log(`Sending data to Google Sheets... (Payload size: ${payloadSize} KB)`);

  // IMPORTANTE: Google Apps Script não responde ao preflight OPTIONS,
  // então não podemos usar mode:'cors' + Content-Type:'application/json'.
  // A solução é usar mode:'no-cors' + Content-Type:'text/plain'.
  // O Apps Script recebe o JSON como string em e.postData.contents e faz o parse.
  // A resposta será opaca (não podemos ler o status), mas a requisição chega.
  await fetch(webhookUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Content-Type': 'text/plain',
    },
    body: new URLSearchParams({
  payload: JSON.stringify(dataWithoutPdf)
}),
  });

  // Com no-cors a resposta é sempre opaca — não há como verificar o status HTTP.
  // Consideramos sucesso se o fetch não lançou exceção (rede alcançável).
  console.log("Data sent to Google Sheets (no-cors — response is opaque).");
}