// Deploy as a Web App: execute as the owner, access Anyone.
// Set ACCESS_PASSWORD in Script Properties before deployment.
const BOOK_ID = '1NCfcjOeABQNWiTRCbiu-Quti1cGklA70QD03p8cwZP0';
const ALLOWED = ['camanodiogo@gmail.com','maina.rymsza@gmail.com'];
const LEDGER = 'Lançamentos Painel';
const HEADERS = ['ID','Data','Competência','Tipo','Descrição','Categoria','Responsável','Valor','Situação','Pagamento','Observação','Criado por','Criado em'];
function json_(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
function digest_(s) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,s).map(b=>('0'+(b&255).toString(16)).slice(-2)).join(''); }
function doGet() { return json_({ok:true,service:'Casa Finanças',version:2}); }
function doPost(e) {
  try {
    if (!e.postData || e.postData.contents.length > 12000) throw Error('Solicitação inválida.');
    const body=JSON.parse(e.postData.contents),cache=CacheService.getScriptCache();
    if(body.action==='login') {
      const email=String(body.email||'').trim().toLowerCase();
      if(!ALLOWED.includes(email)) throw Error('E-mail ou senha inválidos.');
      const expected=PropertiesService.getScriptProperties().getProperty('ACCESS_PASSWORD');
      if(!expected)throw Error('O serviço ainda não foi configurado.');
      const lock=LockService.getScriptLock();lock.waitLock(10000);
      try {
        const key='attempt:'+digest_(email),count=Number(cache.get(key)||0);
        if(count>=10)throw Error('Muitas tentativas. Aguarde 15 minutos.');
        if(digest_(String(body.password||''))!==digest_(expected)){cache.put(key,String(count+1),900);throw Error('E-mail ou senha inválidos.');}
        cache.remove(key);
        const token=Utilities.getUuid()+Utilities.getUuid();cache.put('session:'+digest_(token),email,3600);
        return json_({ok:true,token});
      } finally { lock.releaseLock(); }
    }
    const user=cache.get('session:'+digest_(String(body.token||'')));
    if(!ALLOWED.includes(user))return json_({ok:false,code:'AUTH',error:'Sessão expirada. Saia e entre novamente.'});
    const book=SpreadsheetApp.openById(BOOK_ID);
    if(body.action==='read') {
      const main=book.getSheetByName('2025/2026'),ledger=book.getSheetByName(LEDGER);
      if(!main)throw Error('A aba principal não foi encontrada.');
      const personal={};
      [['Maina','MAÍNA - gastos variáveis mensais'],['Diogo','DIOGO - Cópia de gastos variáveis mensais']].forEach(([key,name])=>{const sheet=book.getSheetByName(name);if(sheet)personal[key]=sheet.getRange(1,1,Math.min(sheet.getLastRow()||1,1100),sheet.getLastColumn()||1).getDisplayValues();});
      return json_({ok:true,main:main.getRange(1,1,main.getLastRow()||1,Math.min(main.getLastColumn(),27)).getDisplayValues(),ledger:ledger?ledger.getDataRange().getDisplayValues():[],ledgerGid:ledger?ledger.getSheetId():null,personal});
    }
    if(body.action==='append') {
      const x=body.entry||{};
      if(!/^[a-f0-9-]{36}$/i.test(x.id||''))throw Error('Identificador inválido.');
      if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(x.period||''))throw Error('Competência inválida.');
      if(!/^20\d{2}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(x.date||'')||new Date(x.date+'T12:00:00Z').toISOString().slice(0,10)!==x.date)throw Error('Data inválida.');
      if(!['Receita','Despesa'].includes(x.type)||!['Casa','Diogo','Maina'].includes(x.owner)||!['Pago','Pendente'].includes(x.status))throw Error('Tipo, responsável ou situação inválidos.');
      if(!['Pix','Débito','Crédito','Dinheiro','Transferência','Outro'].includes(x.payment))throw Error('Pagamento inválido.');
      if(typeof x.amount!=='number'||!Number.isFinite(x.amount)||x.amount<=0||x.amount>10000000)throw Error('Valor inválido.');
      if(!String(x.description||'').trim()||x.description.length>160||!String(x.category||'').trim()||x.category.length>80||String(x.note||'').length>500)throw Error('Preencha a descrição e a categoria.');
      const lock=LockService.getScriptLock();lock.waitLock(30000);
      try {
        let sheet=book.getSheetByName(LEDGER);
        if(!sheet){sheet=book.insertSheet(LEDGER);sheet.getRange(1,1,1,HEADERS.length).setValues([HEADERS]).setFontWeight('bold').setBackground('#183e35').setFontColor('#ffffff');sheet.setFrozenRows(1);sheet.setColumnWidths(1,HEADERS.length,130);sheet.setColumnWidth(5,240);sheet.setColumnWidth(11,280);}
        const headers=sheet.getRange(1,1,1,HEADERS.length).getValues()[0];
        if(JSON.stringify(headers)!==JSON.stringify(HEADERS))throw Error('O cabeçalho da aba de lançamentos foi alterado. Revise antes de salvar.');
        const last=sheet.getLastRow();
        if(last>1){const ids=sheet.getRange(2,1,last-1,1).getValues();const found=ids.findIndex(r=>r[0]===x.id);if(found>=0)return json_({ok:true,id:x.id,row:found+2,duplicate:true});}
        const safe=v=>/^[=+@-]/.test(String(v))?"'"+v:String(v||'');
        const row=last+1,values=[x.id,x.date,x.period,x.type,safe(x.description.trim()),safe(x.category),x.owner,Math.round(x.amount*100)/100,x.status,x.payment,safe(x.note),user,new Date().toISOString()];
        sheet.getRange(row,1,1,HEADERS.length).setNumberFormat('@');sheet.getRange(row,1,1,HEADERS.length).setValues([values]);sheet.getRange(row,8).setNumberFormat('0.00');SpreadsheetApp.flush();
        const stored=sheet.getRange(row,1,1,HEADERS.length).getValues()[0];
        if(stored[0]!==x.id||Number(stored[7])!==values[7])throw Error('A leitura de confirmação falhou. Atualize antes de repetir.');
        return json_({ok:true,id:x.id,row});
      } finally { lock.releaseLock(); }
    }
    throw Error('Ação inválida.');
  } catch(error) { return json_({ok:false,error:error.message||'Falha no serviço.'}); }
}
