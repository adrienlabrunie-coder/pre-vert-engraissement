import {breedLabel} from './breed-codes.js';
// Conservative extraction: identifiers are candidates, never silently assigned.
export function parsePassport(text) {
 const source=String(text||'').replace(/\r/g,'');
 const numbers=[...new Set((source.toUpperCase().match(/\bFR(?:[ .-]*\d){10}(?!\d)/g)||[]).map(n=>'FR '+n.replace(/\D/g,'')))];
 const date=source.match(/(?:naissance|n[ée](?:e)?\s+le)\s*[:\-]?\s*(\d{2})[/.\-](\d{2})[/.\-](\d{4})/i);
 const birth=date?`${date[3]}-${date[2]}-${date[1]}`:'';
 const match=pattern=>(source.match(pattern)?.[1]||'').trim();
 const sex=match(/sexe\s*[:\-]?\s*(femelle|m[âa]le|[MF])\b/i);
 return {numbers,fields:{number:numbers.length===1?numbers[0]:'',birth,race:match(/race\s+(?:du\s+)?sujet\s*[:\-]?\s*([^\n]+)/i),father:match(/race\s+(?:du\s+)?p[èe]re\s*[:\-]?\s*([^\n]+)/i),mother:match(/race\s+(?:de\s+la\s+)?m[èe]re\s*[:\-]?\s*([^\n]+)/i),sex:/^(f|femelle)$/i.test(sex)?'F':/^(m|m[âa]le)$/i.test(sex)?'M':''}};
}
export function validatePassport(fields,animals,now){
 const errors=[];const normalized=String(fields.number||'').replace(/\s/g,'').toUpperCase();
 if(!/^FR\d{10}$/.test(normalized))errors.push('Vérifiez le numéro français : FR suivi de 10 chiffres. Pour un autre pays, utilisez la saisie manuelle.');
 if(animals.some(a=>String(a.number).replace(/\s/g,'').toUpperCase()===normalized))errors.push('Ce bovin existe déjà dans le cheptel.');
 if(fields.birth){const d=new Date(fields.birth+'T12:00:00Z');if(Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==fields.birth||fields.birth>now)errors.push('Vérifiez la date de naissance.');}
 if(!['M','F'].includes(fields.sex))errors.push('Vérifiez le sexe de l’animal.');
 return errors;
}

// No guessing from compound payloads or adjacent parent identifiers.
export function parseBarcode(value){
 const raw=String(value||'').trim().toUpperCase();
 const asda=raw.match(/^FR(\d{10}) {2}\d{24}$/);
 if(asda)return 'FR '+asda[1];
 const compact=raw.replace(/\s/g,'');
 if(/^FR\d{10}$/.test(compact))return 'FR '+compact.slice(2);
 if(/^\d{10}$/.test(compact))return 'FR '+compact;
 return '';
}

// ASDA 2007: 14 text characters + 46 digits. Code 128 mode-switch is not payload.
export function parseAsda2007(value,now=new Date().toISOString().slice(0,10)){
 const raw=String(value||'').replace(/[\r\n]+$/,'').toUpperCase();
 if(!/^[A-Z]{2}[A-Z0-9 ]{12}\d{46}$/.test(raw))return null;
 const country=raw.slice(0,2),identifier=raw.slice(2,14).trimEnd();
 if(!identifier||!/^\S+ *$/.test(raw.slice(2,14)))return null;
 if(country!=='FR'||!/^\d{10}$/.test(identifier))return null;
 if(!'012'.includes(raw[14])||raw[30]!=='0'||!'01234569'.includes(raw[31]))return null;
 const date=raw.slice(21,29),birth=`${date.slice(4)}-${date.slice(2,4)}-${date.slice(0,2)}`;
 const parsed=new Date(birth+'T12:00:00Z');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(birth)||!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==birth||birth>now||!['1','2'].includes(raw[29]))return null;
 const codes={race:raw.slice(15,17),father:raw.slice(17,19),mother:raw.slice(19,21)};
 return passportDetails(identifier, birth, raw[29], codes, 'ASDA-2007');
}

function passportDetails(identifier, birth, sex, codes, format) {
 const fields = {number: `FR ${identifier}`, birth, sex: sex === '1' ? 'M' : 'F'};
 const warnings = [];
 for (const [key, code] of Object.entries(codes)) {
  fields[key] = breedLabel(code);
  if (code !== '00' && !fields[key]) {
   warnings.push(`Code racial ${key} ${code} absent du référentiel 2018 : saisie manuelle nécessaire.`);
  }
 }
 return {fields, codes, format, warnings};
}

function shortBirthDate(date, today) {
 const currentYear = Number(today.slice(0, 4));
 const year = Math.floor(currentYear / 100) * 100 + Number(date.slice(4));
 const birth = `${year > currentYear ? year - 100 : year}-${date.slice(2, 4)}-${date.slice(0, 2)}`;
 const parsed = new Date(`${birth}T12:00:00Z`);
 return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === birth && birth <= today ? birth : '';
}

export function decodePassport(value, today = new Date().toISOString().slice(0, 10)) {
 const fullAsda = parseAsda2007(value, today);
 if (fullAsda) return fullAsda;

 const raw = String(value ?? '').trim().toUpperCase().replace(/\s/g, '');
 const passport = raw.match(/^(\d{10})([12])(\d{2})(\d{2})(\d{2})(\d{6})\d$/);
 if (passport) {
  const [, identifier, sex, father, mother, race, date] = passport;
  const birth = shortBirthDate(date, today);
  return birth ? passportDetails(identifier, birth, sex, {race, father, mother}, 'Passeport bovin (ITF)') : null;
 }

 // ASDA à 38 caractères : statut, zone réservée, garantie et département,
 // puis date JJMMAA, sexe, races et cheptel.
 const health = raw.match(/^FR(\d{10})[012]9\d{3}(\d{6})([12])(\d{2})(\d{2})\d{8}$/);
 if (!health) return null;
 const [, identifier, date, sex, father, mother] = health;
 const birth = shortBirthDate(date, today);
 const codes = mother === '00' && father !== '00' ? {race: father} : {father, mother};
 return birth ? passportDetails(identifier, birth, sex, codes, 'ASDA courte') : null;
}

export function decodePassportCapture(value, printedRaceCode) {
 const decoded = decodePassport(value);
 const printedRace = printedRaceCode && breedLabel(printedRaceCode);
 if (decoded?.format === 'ASDA courte' && !decoded.codes.race && printedRace) {
  decoded.codes.race = printedRaceCode;
  decoded.fields.race = printedRace;
 }
 return decoded;
}
