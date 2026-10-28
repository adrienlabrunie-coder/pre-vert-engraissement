import test from 'node:test';import assert from 'node:assert/strict';
import {parsePassport,validatePassport} from '../src/passport.js';
test('Extraction prudente : numéro, naissance, sexe et races étiquetées',()=>{const {fields}=parsePassport('FR 1234 5678 90\nDate de naissance : 12/05/2025\nSexe : Femelle\nRace sujet : Limousine\nRace père : Charolaise\nRace mère : Limousine');assert.equal(fields.number,'FR 1234567890');assert.equal(fields.birth,'2025-05-12');assert.equal(fields.sex,'F');assert.equal(fields.father,'Charolaise');assert.deepEqual(validatePassport(fields,[],'2026-10-28'),[])});
test('Plusieurs numéros de passeport ne sélectionnent pas un parent à la place du sujet',()=>{const p=parsePassport('Sujet FR1234567890\nMère FR0987654321');assert.equal(p.fields.number,'');assert.equal(p.numbers.length,2)});
test('Une date non étiquetée n’est pas attribuée comme naissance',()=>{assert.equal(parsePassport('Édition 01/01/2026').fields.birth,'')});
test('Contrôle de doublon et date impossible',()=>{const fields={number:'FR 1234567890',sex:'M',birth:'2026-02-30'};assert.equal(validatePassport(fields,[{number:'fr1234567890'}],'2026-10-28').length,2)});
