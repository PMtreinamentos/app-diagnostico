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

  console.log(`Sending data to Google Sheets... (Payload size: ${Math.round(JSON.stringify(data).length / 1024)} KB)`);

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors', // 👈 ESSENCIAL
      headers: {
        'Content-Type': 'text/plain', // 👈 ESSENCIAL
      },
      body: JSON.stringify(data),
    });

    console.log("Data sent to Google Sheets (no-cors).");
    
  } catch (error) {
    console.error("Error saving to Google Sheets:", error);
  }
}