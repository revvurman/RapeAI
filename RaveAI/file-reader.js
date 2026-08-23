const readableExtensions = ['txt', 'csv', 'json', 'md', 'log'];
const documentInput = document.querySelector('#fileInput');

if (documentInput) {
  documentInput.addEventListener('change', async (event) => {
    const files = [...event.target.files];
    const readable = files.filter((file) => readableExtensions.includes(file.name.split('.').pop().toLowerCase()));
    const needsParser = files.filter((file) => !readable.includes(file));

    if (readable.length) {
      const file = readable[0];
      const text = await file.text();
      state.fileContext = { name: file.name, text: text.slice(0, 50000) };
      toast(`${file.name} siap dibaca AI. Tanyakan isinya di chat.`);
    }
    if (needsParser.length) {
      toast(`${needsParser.map((file) => file.name).join(', ')} dipilih. Parser PDF/DOCX/XLSX perlu diaktifkan di backend.`);
    }
  });
}
