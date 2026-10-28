import test from 'node:test';import assert from 'node:assert/strict';import {parseBarcode} from '../src/passport.js';
test('Code-barres : identifiant seul, sans déduction des données composites',()=>{assert.equal(parseBarcode('FR1234567890'),'FR 1234567890');assert.equal(parseBarcode('1234567890'),'FR 1234567890');assert.equal(parseBarcode('991234567890999'),'');assert.equal(parseBarcode('FR1234567890;2025-01-01'),'');assert.equal(parseBarcode('https://example.org'),'')});

test('ASDA composite : seul le numéro du sujet est extrait',()=>{assert.equal(parseBarcode('FR1234567890  190992111142666611223344'),'FR 1234567890');assert.equal(parseBarcode('FR1234567890  19099211114266661122334'),'');});
