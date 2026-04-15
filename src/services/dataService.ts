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
    const response = await fetch(webhookUrl, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    console.log(`Google Sheets webhook response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const text = await response.text().catch(() => 'no response body');
      throw new Error(`Webhook failed: ${response.status} ${response.statusText} - ${text}`);
    }

    console.log("Data sent to Google Sheets.");
  } catch (error) {
    console.error("Error saving to Google Sheets:", error);
    throw error;
  }
}