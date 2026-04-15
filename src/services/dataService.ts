/**
 * Service to handle data persistence.
 * For Google Sheets integration, the most common way in this environment is using a Google Apps Script Webhook.
 */

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
    console.error("ERRO: URL do Webhook do Google Sheets não configurada nos Secrets!");
    return;
  }

  console.log(`Sending data to Google Sheets... (Payload size: ${Math.round(JSON.stringify(data).length / 1024)} KB)`);
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify(data),
    });
    
    console.log("Data sent to Google Sheets successfully.");
    return response;
  } catch (error) {
    console.error("Error saving to Google Sheets:", error);
    // We don't throw here to avoid breaking the user experience if saving fails
  }
}
