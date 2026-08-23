function renderAssistantMarkdown(markdown){
  const codeBlocks=[];
  const source=markdown.replace(/```[\w-]*\n?([\s\S]*?)```/g,(_,code)=>{
    codeBlocks.push(`<pre><code>${escapeHtml(code.trim())}</code></pre>`);
    return `@@CODE_BLOCK_${codeBlocks.length-1}@@`;
  });
  let html=escapeHtml(source)
    .replace(/^### (.+)$/gm,'<h4>$1</h4>')
    .replace(/^## (.+)$/gm,'<h3>$1</h3>')
    .replace(/^# (.+)$/gm,'<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*([^*\n]+)\*/g,'<em>$1</em>')
    .replace(/`([^`\n]+)`/g,'<code>$1</code>')
    .replace(/^[-*] (.+)$/gm,'<li>$1</li>')
    .replace(/(<li>.*<\/li>)(?:\n|$)/g,'<ul>$1</ul>')
    .replace(/\n\n/g,'</p><p>')
    .replace(/\n/g,'<br>');
  codeBlocks.forEach((block,index)=>{html=html.replace(`@@CODE_BLOCK_${index}@@`,block);});
  return `<p>${html}</p>`;
}

async function sendMessage(prompt){
  if(!prompt.trim())return;
  $('#welcomeBlock').style.display='none';
  addMessage('user',prompt);
  $('#promptInput').value='';
  autoGrow($('#promptInput'));
  const pending=addMessage('ai','<div class="typing"><i></i><i></i><i></i></div>');
  try{
    const documentContext=state.fileContext?`\n\nDokumen terlampir (${state.fileContext.name}):\n${state.fileContext.text}`:'';const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:prompt+documentContext,mode:state.mode,messages:[...state.messages,{role:'user',content:prompt+documentContext}]})});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||'AI belum dapat menjawab.');
    pending.querySelector('.bubble').innerHTML=renderAssistantMarkdown(data.answer);
    state.messages.push({role:'user',content:prompt},{role:'assistant',content:data.answer});
    if(!state.chats.some(c=>c.title===prompt))state.chats.unshift({title:prompt.slice(0,42)+(prompt.length>42?'…':'')});
    saveChats();
    renderHistory();
  }catch(error){
    pending.querySelector('.bubble').innerHTML=`<p>${escapeHtml(error.message)}</p><p class="ai-note">Isi <strong>GEMINI_API_KEY</strong> di server RaveAI agar model AI aktif.</p>`;
    toast('AI belum terhubung');
  }
}
