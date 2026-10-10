async function sendPageMessage(recipientId, text, token) {
  const res = await fetch('https://graph.facebook.com/v19.0/me/messages', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      messaging_type: 'RESPONSE',
      message: { text: text.slice(0, 1900) },
    }),
  });

  if (!res.ok) console.error('Error enviando mensaje:', await res.text());
  return res.ok;
}

module.exports = { sendPageMessage };