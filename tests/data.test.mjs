import test from 'node:test';
import assert from 'node:assert/strict';
import {csv,money,parseMain,parsePersonal,sum} from '../dist/data.mjs';
test('CSV preserves commas, quoted newlines and escaped quotes',()=>{
 assert.deepEqual(csv('a,"b,c","x""y"\r\n1,"two\nlines",3'),[['a','b,c','x"y'],['1','two\nlines','3']]);
 assert.throws(()=>csv('<html>access denied</html>'));assert.throws(()=>csv('"unfinished'));
});
test('currency does not reinterpret installment expressions',()=>{
 assert.equal(money('R$ 1.234,56'),1234.56);assert.equal(money('1234.56'),1234.56);assert.equal(money('-'),0);assert.equal(money('6*925,21'),null);
});
test('annual blocks exclude totals and retain correct monthly competence',()=>{
 const result=parseMain([['','Controle de gastos 2025'],['','Despesa'],['','Aluguel','1.000,00','???'],['','Total gasto por mês','1000'],['','Renda por mês','2000'],['','Sobra por mês','1000'],['','Controle de gastos 2026'],['','Despesa'],['','Mercado','200'],['','Total gasto por mês','200']]);
 assert.equal(result.entries.length,3);assert.equal(sum(result.entries,'Despesa'),1200);assert.equal(sum(result.entries,'Receita'),2000);assert.deepEqual(result.years,[2025,2026]);assert.equal(result.issues[0].period,'2025-02');assert.equal(result.entries[2].period,'2026-01');
});
test('Maina only imports dated personal blocks, never household card details or subtotals',()=>{
 const rows=Array.from({length:12},()=>[]);rows[0][0]='Combustível crédito10/2026';rows[1][0]='03/10';rows[1][1]=200;
 rows[0][9]='Cash 10/2026';rows[1][9]='06/10';rows[1][10]=83.84;rows[1][11]='Feijoada';rows[2][9]='06/10';rows[2][10]=159.90;rows[2][11]='Pod';rows[3][9]='Total cash';rows[3][10]=243.74;
 rows[5][13]='outros débitos 09/2026';rows[5][14]=320;rows[6][13]='natação';rows[6][14]=320;
 const result=parsePersonal(rows,'Maina');assert.equal(result.entries.length,3);assert.equal(sum(result.entries),563.74);assert.equal(sum(result.entries.filter(x=>x.period==='2026-10')),243.74);
 assert.equal(parsePersonal(rows,'Diogo').entries.length,0);
});
